const moment = require("moment");
const fs = require("fs");
const filesize = require("filesize");

const RecordController = require("./record-controller");
const DbController = require("./db-controller");
const M3U8Controller = require("./m3u8-controller");
const LogController = require("./log-controller");
const {getFileName} = require("./utils");

module.exports = class ViewController {

    static async index(req, res) {
        const jobs = await DbController.getJobs();
        for (let job of jobs) {
            job.fileSize =
                job.status && fs.existsSync(job.fileName) ?
                    filesize.filesize(fs.statSync(job.fileName).size, {standard: "iec", round: 2}) :
                    undefined;
        }

        const response = {
            title: "IPTV Recorder Status Page",
            status: RecordController.isRunning(),
            jobs: jobs
        };
        res.render('index', response);
    }


    static async stop(req, res) {
        await RecordController.stop();
        res.redirect("/");
    }

    static async addJob(req, res) {
        if (!req.body.channelName || !req.body.startDate || !req.body.endDate) {
            res.redirect("/");
            return;
        }

        const m3u8 = M3U8Controller.find(req.body.channelName);
        if (!m3u8) {
            res.redirect("/");
            return;
        }

        const job = {
            channelName: m3u8.inf.title,
            channelUrl: m3u8.url,
            fileName: getFileName(m3u8.inf.title, moment(req.body.startDate)),
            startTimestamp: moment(req.body.startDate),
            endTimestamp: moment(req.body.endDate),
            status: false
        }

        await DbController.insertJob(job);
        LogController.info("JOB", "ADD", job);
        res.redirect("/");
    }

    static async deleteJob(req, res) {
        await DbController.deleteJob(req.body.id);
        LogController.info("JOB", "DELETE", {id: req.body.id});
        res.redirect("/");
    }

    static async clearFinishedJobs(req, res) {
        await DbController.clearFinishedJobs();
        LogController.info("JOB", "DELETE_FINISHED");
        res.redirect("/");
    }
}
