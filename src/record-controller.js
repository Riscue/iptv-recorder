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

            RecordController.recordProcess = RecordController.runCommand("ffmpeg", [
                "-i", `${RecordController.job.channelUrl}`,
                "-c", "copy",
                "-f", "hls",
                "-hls_time", "15",
                "-hls_list_size", "0",
                "-hls_segment_filename", path.join(segmentDir, "%08d.ts"),
                "-hls_base_url", `${parsedPath.name}/`,
                m3u8Path
            ]);

            RecordController.isRecording = true;
        }
    }

    static runCommand(command, args) {
        const child = child_process.spawn(command, args);

        child.stdoutLog = "";
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (data) => child.stdoutLog += data.toString());

        child.stderrLog = "";
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (data) => child.stderrLog += data.toString());

        return child;
    }

    static async stop() {
        if (!!RecordController.recordProcess && RecordController.recordProcess.kill('SIGTERM')) {
            LogController.info("RECORD", "FINISHED");

            await DbController.updateJob(RecordController.job.id, {status: true, record: "SUCCESS"});

            RecordController.isRecording = false;
            RecordController.recordProcess = undefined;
            RecordController.job = undefined;
        }
    }

    static isRunning() {
        return RecordController.isRecording && !!RecordController.recordProcess && isRunning(RecordController.recordProcess.pid);
    }
}
