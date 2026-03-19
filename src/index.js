const express = require('express');
const bodyParser = require('body-parser');
const process = require('process');
const favicon = require('serve-favicon');
const path = require('path');

const ViewController = require("./view-controller");
const LogController = require("./log-controller");
const JobController = require("./job-controller");
const M3U8Controller = require("./m3u8-controller");
const fs = require("fs");
const {downloadFolder} = require("./contants");

const signals = ["SIGTERM", "SIGINT"];
const shutdown = async (signal) => {
    console.log(`Got signal: ${signal}`);
    process.exit(0);
};
signals.forEach((signal) => {
    process.on(signal, shutdown);
});

fs.mkdirSync(downloadFolder, {recursive: true});
M3U8Controller.prepare();

JobController.registerJobs();

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'pug')
app.use(favicon(path.join(__dirname, 'favicon.png')))

// Static file serving for HLS segments
app.use('/recordings', express.static(downloadFolder))

app.get('/', ViewController.index);
app.get('/api/channels/search', ViewController.searchChannels);

app.post('/stop', ViewController.stop);

app.post('/addJob', ViewController.addJob);
app.post('/deleteJob', ViewController.deleteJob);
app.post('/startJob', ViewController.startJob);
app.post('/clearFinishedJobs', ViewController.clearFinishedJobs);

app.get('/play', ViewController.play);

app.get('/api/status', ViewController.getStatus);

app.listen(3000, () => {
    LogController.info("SERVER", "RUNNING", {address: "http://localhost:3000"});
});
