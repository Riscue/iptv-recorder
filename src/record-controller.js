const {exec} = require('child_process');
const isRunning = require('is-running');

module.exports = class RecordController {

    static isRecording = false;
    static recordingProcess;

    static startRecording(inputStreamUrl, outputFileName) {
        if (!this.isRecording) {
            const ffmpegCommand = `ffmpeg -i ${inputStreamUrl} ${outputFileName}`;
            console.log("Recording started.");
            this.recordingProcess = exec(ffmpegCommand, (error, stdout, stderr) => {
                this.isRecording = false;
                if (error) {
                    console.error(`Hata oluştu: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`Stderr: ${stderr}`);
                    return;
                }
                console.log(`stdout: ${stdout}`);
            });
            this.isRecording = true;
        }
    };

    static stopRecording() {
        if (this.isRecording) {
            console.log("Recording stopped.");
            if (this.recordingProcess && isRunning(this.recordingProcess.pid)) {
                // ffmpeg işlemini sonlandır
                process.kill(this.recordingProcess.pid, 'SIGTERM');
            }
            this.isRecording = false;
        }
    };

    static isRunning() {
        return this.isRecording && this.recordingProcess && isRunning(this.recordingProcess.pid);
    }

    static checkIfRecordingIsRunning() {
        if (this.isRecording && this.recordingProcess && !isRunning()) {
            console.log("Recording stopped unexpectedly.");
            this.isRecording = false;
        }
    };
}
