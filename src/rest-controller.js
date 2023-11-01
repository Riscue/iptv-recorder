const moment = require("moment/moment");

const DbController = require("./db-controller");
const LogController = require("./log-controller");
const M3U8Controller = require("./m3u8-controller");
const {downloadFolder} = require("./contants");

module.exports = class RestController {

    static async stop(req, res) {
        res.redirect("/");
    }

    static async addJob(req, res) {
        if (!req.body.channelName || !req.body.startDate || !req.body.endDate) {
            res.redirect("/");
            return;
        }

        const m3u8 = M3U8Controller.find(req.body.channelName);
        if (!m3u8) {
            return;
        }

        const job = {
            channelName: m3u8.inf.title,
            channelUrl: m3u8.url,
            fileName: RestController.getFileName(m3u8),
            startTimestamp: moment(req.body.startDate),
            endTimestamp: moment(req.body.endDate),
            status: false
        }

        await DbController.insertJob(job);
        LogController.info("JOB", "ADD", job);
        res.redirect("/");
    }

    static getFileName(m3u8) {
        return `${downloadFolder}/${m3u8.inf.title.trim().replace(/[ \/\\:]+/g, '-')}-${moment(new Date()).format('yyyy-MM-DD-HH-mm')}.mp4`;
    }

    static async deleteJob(req, res) {
        await DbController.deleteJob(req.body.id);
        LogController.info("JOB", "DELETE", {id: req.body.id});
        res.redirect("/");
    }

    static async clearJobs(req, res) {
        await DbController.clearJobs();
        LogController.info("JOB", "DELETE_ALL");
        res.redirect("/");
    }
}
