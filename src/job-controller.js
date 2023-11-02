const RecordController = require("./record-controller");
const LogController = require("./log-controller");
const DbController = require("./db-controller");
const {getFileName} = require("./utils");
const {maxRetryCount} = require("./contants");

module.exports = class JobController {

    static registerJobs() {
        setInterval(JobController.checkTimeAndAct, 1 * 60 * 1000);
        setInterval(JobController.checkRecordStatus, 10 * 1000);
    }

    static async checkTimeAndAct() {
        if (RecordController.isRecording && !!RecordController.recordProcess) {
            return;
        }

        const jobs = await DbController.getUnrecordedJobs();
        if (jobs.length === 0) {
            return;
        }

        const job = jobs.sort((a, b) => a.startTimestamp - b.endTimestamp)[0];

        if (new Date() > job.startTimestamp) {
            RecordController.job = await DbController.updateJob(job.id, {status: true});
            RecordController.start();
        }
    }

    static async checkRecordStatus() {
        if (RecordController.isRecording && !!RecordController.recordProcess) {
            if (RecordController.isRunning()) {
                if (new Date() > RecordController.job.endTimestamp) {
                    await RecordController.stop();
                }
            } else {
                LogController.error("RECORD", "UNEXPECTED", {
                    stdout: RecordController.recordProcess.stdoutLog, stderr: RecordController.recordProcess.stderrLog
                });

                RecordController.isRecording = false;
                RecordController.recordProcess = undefined;

                await DbController.updateJob(RecordController.job.id, {
                    status: RecordController.job.count > maxRetryCount - 2,
                    record: "ERROR",
                    fileName: getFileName(RecordController.job.channelName),
                    count: (RecordController.job.count || 0) + 1
                });
            }
        }
    }
}
