const DbController = require("./db-controller");

module.exports = class RestController {

    static async stop(req, res) {
        res.send(await DbController.getJobs());
    }

    static async getJobs(req, res) {
        res.send(await DbController.getJobs());
    }

    static async postJob(req, res) {
        const job = {
            channelName: req.body.channelName,
            startDate: req.body.startDate,
            endDate: req.body.endDate
        }
        await DbController.insertJob(job);
        res.send(job);
    }

    static async deleteJob(req, res) {
        res.send(await DbController.getJobs());
    }
}
