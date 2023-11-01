const {exec} = require('child_process');
const isRunning = require('is-running');

const LogController = require("./log-controller");
const DbController = require("./db-controller");

module.exports = class RecordController {

    static isRecording = false;
    static recordProcess;
    static job;

    static start() {
        if (!RecordController.isRecording) {
            const ffmpegCommand = `ffmpeg -i "${RecordController.job.channelUrl}" -c copy "${RecordController.job.fileName}"`;
            LogController.info("RECORD", "START");
            RecordController.recordProcess = exec(ffmpegCommand, async (error, stdout, stderr) => {
                RecordController.isRecording = false;
                RecordController.recordProcess = undefined;
                if (error) {
                    await DbController.updateJob(RecordController.job.id, {
                        ...await DbController.getJob(RecordController.job.id),
                        record: "ERROR", log: error.message
                    });
                    LogController.error("RECORD", "ERROR");
                    return;
                }
                if (stderr) {
                    await DbController.updateJob(RecordController.job.id, {
                        ...await DbController.getJob(RecordController.job.id),
                        record: "STDERR",
                        log: stderr
                    });
                    LogController.error("RECORD", "STDERR");
                    return;
                }
                await DbController.updateJob(RecordController.job.id, {
                    ...await DbController.getJob(RecordController.job.id),
                    record: "FINISH",
                    log: stdout
                });
                LogController.info("RECORD", "FINISH");
            });
            RecordController.isRecording = true;
        }
    };

    static stop() {
        if (RecordController.isRecording) {
            if (RecordController.recordProcess && isRunning(RecordController.recordProcess.pid)) {
                if (RecordController.recordProcess.kill()) {
                    RecordController.isRecording = false;
                    RecordController.recordProcess = undefined;
                    LogController.info("RECORD", "STOPPED");
                }
            }
        }
    };

    static isRunning() {
        return RecordController.isRecording && RecordController.recordProcess && isRunning(RecordController.recordProcess.pid);
    }
}
