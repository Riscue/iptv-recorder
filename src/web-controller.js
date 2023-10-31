const RecordController = require("./record-controller");
const DbController = require("./db-controller");
const moment = require("moment/moment");

module.exports = class WebController {

    static index(req, res) {
        const htmlResponse = `
            <html>
                <body>
                    <h1>Recording Status</h1>
                    <p>${RecordController.isRunning() ? "Recording is ongoing." : "Not recording."}</p>
                </body>
            </html>`;
        res.send(htmlResponse);
    }

    static async getJobs(req, res) {
        res.send(await DbController.getJobs());
    }

    static postJob(req, res) {
        (async () => {
            await DbController.clearJobs();
            await DbController.insertJob(
                "https://cdn.flowplayer.com/a30bd6bc-f98b-47bc-abf5-97633d4faea0/hls/de3f6ca7-2db3-4689-8160-0f574a5996ad/playlist.m3u8",
                "output_file.mp4",
                moment().add(10, 'seconds').unix(),
                moment().add(40, 'seconds').unix()
            );
            console.log(await DbController.getJobs());
        })();
        res.send('OK');
    }
}
