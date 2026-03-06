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
            RecordController.recordProcess = RecordController.runCommand("ffmpeg", [
                "-i", `${RecordController.job.channelUrl}`,
                "-c", "copy",
                "-f", "mpegts",
                `${RecordController.job.fileName}`
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
