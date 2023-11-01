const DbController = require("./db-controller");
const LogController = require("./log-controller");
const moment = require("moment/moment");

module.exports = class RestController {

    static async stop(req, res) {
        res.redirect("/");
    }

    static async addJob(req, res) {
        if (!req.body.channelName || !req.body.startDate || !req.body.endDate) {
            res.redirect("/");
            return;
        }

        const job = {
            channelName: req.body.channelName,
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

    static async clearJobs(req, res) {
        await DbController.clearJobs();
        LogController.info("JOB", "DELETE_ALL");
        res.redirect("/");
    }
}
