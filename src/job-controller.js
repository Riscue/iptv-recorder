const moment = require('moment/moment');

const RecordController = require("./record-controller");
const LogController = require("./log-controller");
const DbController = require("./db-controller");

module.exports = class JobController {

    static registerJobs() {
        setInterval(JobController.checkTimeAndAct, 10 * 1000);
        setInterval(JobController.checkRecordStatus, 1000);
    }

    static async checkTimeAndAct() {
        if (RecordController.isRecording && RecordController.recordProcess) {
            return;
        }

        LogController.info("JOB", "CHECK");

        const jobs = await DbController.getUnrecordedJobs();
        if (jobs.length === 0) {
            return;
        }

        const job = jobs.sort((a, b) => a.startTimestamp - b.endTimestamp)[0];

        const now = new Date();
        if (now > job.startTimestamp) {
            job.status = true;
            await DbController.updateJob(job.id, job);
            RecordController.job = job;
            RecordController.start();
        }
    }

    static checkRecordStatus() {
        if (RecordController.isRecording && RecordController.recordProcess) {
            if (RecordController.isRunning()) {
                const now = moment().format("HH:mm");
                if (now > RecordController.job.endDate) {
                    RecordController.stop();
                }
            } else {
                LogController.error("RECORD", "UNEXPECTED");
                RecordController.isRecording = false;
            }
        }
    }
}
