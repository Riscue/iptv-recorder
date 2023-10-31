const moment = require('moment/moment');

const RecordController = require("./record-controller");

module.exports = class JobController {

    static checkTimeAndAct(startTime, endTime) {
        const now = moment().format("HH:mm");
        if (now === startTime) {
            RecordController.startRecording("https://cdn.flowplayer.com/a30bd6bc-f98b-47bc-abf5-97633d4faea0/hls/de3f6ca7-2db3-4689-8160-0f574a5996ad/playlist.m3u8", "output_file.mp4");
        }
        if (now === endTime) {
            RecordController.stopRecording();
        }
    }

    static registerJobs(startTime, endTime) {
        setInterval(JobController.checkTimeAndAct, 1000, startTime, endTime);
        setInterval(RecordController.checkIfRecordingIsRunning, 5000);
    }
}
