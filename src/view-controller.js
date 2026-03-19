const moment = require("moment");
const fs = require("fs");
const filesize = require("filesize");
const M3U8FileParser = require('m3u8-file-parser');

const RecordController = require("./record-controller");
const ConvertController = require("./convert-controller");
const DbController = require("./db-controller");
const M3U8Controller = require("./m3u8-controller");
const LogController = require("./log-controller");
const {getFileName} = require("./utils");
const {playlistFile, downloadFolder} = require("./contants");

module.exports = class ViewController {

    static async searchChannels(req, res) {
        try {
            const query = req.query.q?.trim().toLowerCase();
            if (!query || query.length < 3) {
                return res.json({channels: []});
            }

            if (!fs.existsSync(playlistFile)) {
                return res.json({channels: []});
            }

            const content = fs.readFileSync(playlistFile, {encoding: 'utf-8'});
            const parser = new M3U8FileParser();
            parser.read(content);
            const playlist = parser.getResult();

            const channels = (playlist.segments || [])
                .map(s => s.inf.title)
                .filter(t => t && t.trim() && t.toLowerCase().includes(query))
                .sort()
                .slice(0, 20);

            res.json({channels});
        } catch (e) {
            LogController.error("API", "CHANNEL_SEARCH", {error: e.message});
            res.json({channels: []});
        }
    }

    static async getStatus(req, res) {
        res.json({
            recording: RecordController.isRunning(),
            converting: ConvertController.isConverting
        });
    }

    static async index(req, res) {
        const jobs = await DbController.getJobs();
        for (let job of jobs) {
            // Convert date strings back to Date objects
            if (job.startTimestamp && typeof job.startTimestamp === 'string') {
                job.startTimestamp = new Date(job.startTimestamp);
            }
            if (job.endTimestamp && typeof job.endTimestamp === 'string') {
                job.endTimestamp = new Date(job.endTimestamp);
            }

            // Original HLS recording size (sum of all .ts segments)
            if (job.status) {
                const recordingSize = RecordController.getRecordingSize(job);
                job.fileSize = recordingSize > 0 ?
                    filesize.filesize(recordingSize, {standard: "iec", round: 2}) :
                    undefined;
            }

            // MP4 file size (if converted)
            if (job.mp4Path && fs.existsSync(job.mp4Path)) {
                job.mp4FileSize = filesize.filesize(fs.statSync(job.mp4Path).size, {standard: "iec", round: 2});
            }
        }

        const response = {
            title: "IPTV Recorder",
            status: RecordController.isRunning(),
            jobs: jobs,
            currentJob: RecordController.isRecording ? RecordController.job : null,
            isConverting: ConvertController.isConverting,
            convertingJob: ConvertController.isConverting ? ConvertController.currentJob : null
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

    static async startJob(req, res) {
        try {
            const jobId = req.body.id;
            if (!jobId) {
                res.redirect("/");
                return;
            }

            const job = await DbController.getJob(jobId);
            if (!job) {
                LogController.error("JOB", "NOT_FOUND", {id: jobId});
                res.redirect("/");
                return;
            }

            // Don't start if already recording
            if (RecordController.isRecording) {
                LogController.info("JOB", "ALREADY_RECORDING", {current: RecordController.job.channelName});
                res.redirect("/");
                return;
            }

            // Find m3u8 channel
            const m3u8 = M3U8Controller.find(job.channelName);
            if (!m3u8) {
                LogController.error("JOB", "CHANNEL_NOT_FOUND", {channel: job.channelName});
                res.redirect("/");
                return;
            }

            // Update job with m3u8 info (url may have changed)
            job.channelUrl = m3u8.url;

            // Set job and start recording
            RecordController.job = job;
            RecordController.start();

            if (RecordController.isRecording) {
                // Clear error status and retry count when manually starting
                await DbController.updateJob(job.id, {
                    status: true,
                    record: undefined,
                    count: undefined,
                    channelUrl: m3u8.url
                });
                LogController.info("JOB", "MANUAL_START", {
                    id: job.id,
                    channel: job.channelName,
                    url: m3u8.url
                });
            } else {
                LogController.error("JOB", "START_FAILED", {channel: job.channelName});
            }

            res.redirect("/");
        } catch (e) {
            LogController.error("JOB", "START_ERROR", {error: e.message, stack: e.stack});
            res.redirect("/");
        }
    }

    static async play(req, res) {
        try {
            const jobId = req.query.id;
            if (!jobId) {
                return res.status(400).send('Job ID gerekli');
            }

            const job = await DbController.getJob(jobId);
            if (!job) {
                return res.status(404).send('Video bulunamadı - Job ID: ' + jobId);
            }

            // Check if recording is in progress
            const isCurrentlyRecording = RecordController.isRecording &&
                RecordController.job &&
                RecordController.job.id === job.id;

            const recordingPath = isCurrentlyRecording ? job.fileName : (job.mp4Path || null);
            if (!recordingPath || !fs.existsSync(recordingPath)) {
                return res.status(404).send('Video dosyası bulunamadı');
            }

            res.render('play', {
                title: "Oynat - " + job.channelName,
                channelName: job.channelName,
                videoPath: `recordings/${recordingPath.replace(downloadFolder, '')}`,
                isLive: isCurrentlyRecording,
                startTime: job.startTimestamp,
                endTime: job.endTimestamp
            });
        } catch (e) {
            res.status(500).send('Hata: ' + e.message);
        }
    }
}
