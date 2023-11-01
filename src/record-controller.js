const {exec} = require('child_process');
const isRunning = require('is-running');

const LogController = require("./log-controller");

module.exports = class RecordController {

    static isRecording = false;
    static recordingProcess;

    static startRecording(inputStreamUrl, outputFileName) {
        if (!this.isRecording) {
            const ffmpegCommand = `ffmpeg -i ${inputStreamUrl} ${outputFileName}`;
            LogController.info("RECORD", "START");
            this.recordingProcess = exec(ffmpegCommand, (error, stdout, stderr) => {
                this.isRecording = false;
                if (error) {
                    LogController.error("RECORD", "ERROR", error.message);
                    return;
                }
                if (stderr) {
                    LogController.error("RECORD", "STDERR", stderr);
                    return;
                }
                LogController.info("RECORD", "FINISH", {log: stdout});
            });
            this.isRecording = true;
        }
    };

    static stopRecording() {
        if (this.isRecording) {
            if (this.recordingProcess && isRunning(this.recordingProcess.pid)) {
                process.kill(this.recordingProcess.pid, 'SIGTERM');
            }
            LogController.info("RECORD", "STOPPED");
            this.isRecording = false;
        }
    };

    static isRunning() {
        return this.isRecording && this.recordingProcess && isRunning(this.recordingProcess.pid);
    }

    static checkIfRecordingIsRunning() {
        if (this.isRecording && this.recordingProcess && !isRunning()) {
            LogController.error("RECORD", "UNEXPECTED");
            this.isRecording = false;
        }
    };
}
