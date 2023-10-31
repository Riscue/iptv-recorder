const RecordController = require("./record-controller");
const DbController = require("./db-controller");

module.exports = class ViewController {

    static async index(req, res) {
        const response = {
            title: "IPTV Recorder Status Page",
            status: RecordController.isRunning(),
            jobs: await DbController.getJobs()
        };
        res.render('index', response);
    }
}
