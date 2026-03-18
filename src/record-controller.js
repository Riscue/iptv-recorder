const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const isRunning = require('is-running');

const LogController = require("./log-controller");
const DbController = require("./db-controller");

module.exports = class RecordController {

    static isRecording = false;
    static recordProcess;
    static job;

    static start() {
        if (!RecordController.isRecording) {
            LogController.info("RECORD", "START");

            const m3u8Path = RecordController.job.fileName;
            const parsedPath = path.parse(m3u8Path);

            const segmentDir = path.join(parsedPath.dir, parsedPath.name);

            if (!fs.existsSync(segmentDir)) {
                fs.mkdirSync(segmentDir, {recursive: true});
            }

            try {
                RecordController.recordProcess = RecordController.runCommand("ffmpeg", [
                    "-i", `${RecordController.job.channelUrl}`,
                    "-c", "copy",
                    "-f", "hls",
                    "-hls_time", "5",
                    "-hls_list_size", "0",
                    "-hls_flags", "delete_segments+append_list",
                    "-hls_segment_filename", path.join(segmentDir, "%08d.ts"),
                    "-hls_base_url", `${parsedPath.name}/`,
                    m3u8Path
                ]);

                // Listen for process exit
                RecordController.recordProcess.on('exit', (code, signal) => {
                    if (RecordController.isRecording) {
                        LogController.info("RECORD", "EXIT", {code, signal});
                    }
                });

                RecordController.isRecording = true;
            } catch (err) {
                LogController.error("RECORD", "START_ERROR", {error: err.message});
                RecordController.isRecording = false;
                RecordController.recordProcess = undefined;
            }
        }
    }

    static runCommand(command, args) {
        const child = child_process.spawn(command, args);

        // Handle spawn errors (e.g., ffmpeg not found)
        child.on('error', (err) => {
            LogController.error("RECORD", "SPAWN_ERROR", {error: err.message, code: err.code});
        });

        child.stdoutLog = "";
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (data) => child.stdoutLog += data.toString());

        child.stderrLog = "";
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (data) => child.stderrLog += data.toString());

        return child;
    }

    static getRecordingSize(job) {
        // Get the segment directory
        const parsedPath = path.parse(job.fileName);
        const segmentDir = path.join(parsedPath.dir, parsedPath.name);

        if (!fs.existsSync(segmentDir)) {
            return 0;
        }

        // Calculate total size of all .ts files in segment directory
        let totalSize = 0;
        try {
            const files = fs.readdirSync(segmentDir);
            for (const file of files) {
                if (file.endsWith('.ts')) {
                    const filePath = path.join(segmentDir, file);
                    if (fs.existsSync(filePath)) {
                        totalSize += fs.statSync(filePath).size;
                    }
                }
            }
        } catch (e) {
            LogController.error("RECORD", "SIZE_CHECK_ERROR", {error: e.message});
        }

        return totalSize;
    }

    static async stop() {
        if (!!RecordController.recordProcess && RecordController.recordProcess.kill('SIGTERM')) {
            LogController.info("RECORD", "FINISHED");

            const job = RecordController.job;

            // Check if recording was successful by checking segment files size
            let recordStatus = "SUCCESS";
            const recordingSize = RecordController.getRecordingSize(job);
            const recordingSizeKB = recordingSize / 1024;

            if (recordingSizeKB < 100) {
                // Less than 100KB means recording probably failed
                recordStatus = "ERROR";
                LogController.error("RECORD", "RECORDING_TOO_SMALL", {
                    channel: job.channelName,
                    segmentDir: path.join(path.parse(job.fileName).dir, path.parse(job.fileName).name),
                    size: recordingSizeKB.toFixed(2) + ' KB'
                });
            } else {
                LogController.info("RECORD", "SIZE_OK", {
                    channel: job.channelName,
                    size: (recordingSizeKB / 1024).toFixed(2) + ' MB'
                });
            }

            await DbController.updateJob(job.id, {status: true, record: recordStatus});

            // Update job object with new record status
            job.record = recordStatus;

            RecordController.isRecording = false;
            RecordController.recordProcess = undefined;
            RecordController.job = undefined;

            return job;
        }
        return null;
    }

    static isRunning() {
        return RecordController.isRecording && !!RecordController.recordProcess && isRunning(RecordController.recordProcess.pid);
    }
}
