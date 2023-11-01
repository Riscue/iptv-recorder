const DbController = require("./db-controller");
const LogController = require("./log-controller");

module.exports = class RestController {

    static async stop(req, res) {
        res.redirect("/");
    }

    static async addJob(req, res) {
        const job = {
            channelName: req.body.channelName,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            status: false
        }

        if (!!job.channelName && !!job.startDate && !!job.endDate) {
            await DbController.insertJob(job);
            LogController.info("JOB", "ADD", job);
        }
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
