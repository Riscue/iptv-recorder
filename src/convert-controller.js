const fs = require('fs');
const path = require('path');
const moment = require("moment");
const filesize = require("filesize");

const RecordController = require("./record-controller");
const DbController = require("./db-controller");
const LogController = require("./log-controller");

const {downloadFolder} = require("./contants");

module.exports = class ConvertController {

    static isConverting = false;
    static convertProcess;
    static currentJob;

    // Convert HLS to MP4
    static async start(job) {
        if (ConvertController.isConverting) {
            return;
        }

        if (!fs.existsSync(job.fileName)) {
            LogController.error("CONVERT", "FILE_NOT_FOUND", {fileName: job.fileName});
            await DbController.updateJob(job.id, {record: "ERROR", mp4Path: null});
            return;
        }

        // Check segment directory size - if too small, it's probably a failed recording
        const parsedPath = path.parse(job.fileName);
        const segmentDir = path.join(parsedPath.dir, parsedPath.name);

        let totalSize = 0;
        if (fs.existsSync(segmentDir)) {
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
                LogController.error("CONVERT", "SIZE_CHECK_ERROR", {error: e.message});
            }
        }

        const totalSizeKB = totalSize / 1024;

        if (totalSizeKB < 100) { // Less than 100KB means recording failed
            LogController.error("CONVERT", "RECORDING_TOO_SMALL", {
                channel: job.channelName,
                segmentDir,
                size: totalSizeKB.toFixed(2) + ' KB'
            });
            await DbController.updateJob(job.id, {
                record: "ERROR",
                mp4Path: null,
                mp4Size: totalSizeKB.toFixed(2) + ' KB'
            });
            return;
        }

        LogController.info("CONVERT", "SIZE_OK", {
            channel: job.channelName,
            size: (totalSizeKB / 1024).toFixed(2) + ' MB'
        });

        ConvertController.isConverting = true;
        ConvertController.currentJob = job;

        const m3u8Path = job.fileName;
        const mp4Path = m3u8Path.replace('.m3u8', '.mp4');

        LogController.info("CONVERT", "START", {
            channel: job.channelName,
            from: m3u8Path,
            to: mp4Path
        });

        // FFmpeg command to convert HLS to MP4
        ConvertController.convertProcess = require('child_process').spawn('ffmpeg', [
            '-i', m3u8Path,
            '-c', 'copy',
            '-bsf:a', 'aac_adtstoasc',
            '-y',
            mp4Path
        ]);

        let stderrLog = '';
        ConvertController.convertProcess.stderr.setEncoding('utf8');
        ConvertController.convertProcess.stderr.on('data', (data) => {
            stderrLog += data.toString();
        });

        ConvertController.convertProcess.on('error', (err) => {
            LogController.error("CONVERT", "SPAWN_ERROR", {error: err.message});
            ConvertController.isConverting = false;
            ConvertController.convertProcess = undefined;
            ConvertController.currentJob = undefined;
        });

        ConvertController.convertProcess.on('exit', async (code, signal) => {
            if (code === 0) {
                LogController.info("CONVERT", "SUCCESS", {
                    channel: job.channelName,
                    mp4: mp4Path
                });

                // Get file sizes
                const mp4Size = fs.existsSync(mp4Path) ?
                    filesize.filesize(fs.statSync(mp4Path).size, {standard: "iec", round: 2}) : 'N/A';

                // Update job with MP4 info
                await DbController.updateJob(job.id, {
                    record: "SUCCESS",
                    mp4Path: mp4Path,
                    mp4Size: mp4Size
                });

                // Schedule cleanup of TS/M3U8 files (24 hours later)
                ConvertController.scheduleCleanup(job);

            } else {
                LogController.error("CONVERT", "FAILED", {
                    channel: job.channelName,
                    code,
                    signal,
                    stderr: stderrLog.substring(-500)
                });

                await DbController.updateJob(job.id, {
                    record: "ERROR",
                    mp4Path: null,
                    mp4Size: 'Conversion failed'
                });
            }

            ConvertController.isConverting = false;
            ConvertController.convertProcess = undefined;
            ConvertController.currentJob = undefined;
        });
    }

    // Schedule cleanup of temporary files after 24 hours
    static scheduleCleanup(job) {
        const m3u8Path = job.fileName;
        const parsedPath = path.parse(m3u8Path);
        const segmentDir = path.join(parsedPath.dir, parsedPath.name);

        // Schedule cleanup 24 hours from now
        setTimeout(() => {
            ConvertController.cleanup(job, segmentDir);
        }, 24 * 60 * 60 * 1000);

        LogController.info("CONVERT", "CLEANUP_SCHEDULED", {
            time: moment().add(24, 'hours').format('YYYY-MM-DD HH:mm:ss'),
            segmentDir
        });
    }

    // Cleanup temporary TS/M3U8 files
    static cleanup(job, segmentDir) {
        try {
            // Delete m3u8 file
            if (fs.existsSync(job.fileName)) {
                fs.unlinkSync(job.fileName);
                LogController.info("CONVERT", "CLEANUP_M3U8", {file: job.fileName});
            }

            // Delete segment directory
            if (fs.existsSync(segmentDir)) {
                fs.rmSync(segmentDir, {recursive: true, force: true});
                LogController.info("CONVERT", "CLEANUP_SEGMENTS", {dir: segmentDir});
            }

        } catch (e) {
            LogController.error("CONVERT", "CLEANUP_ERROR", {error: e.message});
        }
    }

    // Get MP4 file for playback
    static getMp4Path(job) {
        return job.mp4Path || null;
    }

    // Check if conversion is in progress
    static isRunning() {
        return ConvertController.isConverting && !!ConvertController.convertProcess;
    }
}
