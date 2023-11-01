const {exec} = require('child_process');
const isRunning = require('is-running');

const LogController = require("./log-controller");
const DbController = require("./db-controller");

module.exports = class RecordController {

    static isRecording = false;
    static recordProcess;
    static job;

    static start() {
        if (!this.isRecording) {
            const ffmpegCommand = `ffmpeg -i "${RecordController.job.channelUrl}" -c copy "${RecordController.job.fileName}"`;
            LogController.info("RECORD", "START");
            this.recordProcess = exec(ffmpegCommand, async (error, stdout, stderr) => {
                this.isRecording = false;
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
            this.isRecording = true;
        }
    };

    static stop() {
        if (this.isRecording) {
            if (this.recordProcess && isRunning(this.recordProcess.pid)) {
                process.kill(this.recordProcess.pid, 'SIGTERM');
            }
            LogController.info("RECORD", "STOPPED");
            this.isRecording = false;
        }
    };

    static isRunning() {
        return this.isRecording && this.recordProcess && isRunning(this.recordProcess.pid);
    }
}
