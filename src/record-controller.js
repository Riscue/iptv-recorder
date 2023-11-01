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
            const ffmpegCommand = `ffmpeg -i ${RecordController.job.inputStreamUrl} ${RecordController.job.outputFileName}`;
            LogController.info("RECORD", "START");
            this.recordProcess = exec(ffmpegCommand, (error, stdout, stderr) => {
                this.isRecording = false;
                if (error) {
                    DbController.updateJob(RecordController.job.id, {...DbController.getJob(RecordController.job.id), record: "ERROR", log: error.message});
                    return;
                }
                if (stderr) {
                    DbController.updateJob(RecordController.job.id, {...DbController.getJob(RecordController.job.id), record: "STDERR", log: stderr});
                    return;
                }
                DbController.updateJob(RecordController.job.id, {...DbController.getJob(RecordController.job.id), record: "FINISH", log: stdout});
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
