const express = require('express');
const bodyParser = require('body-parser');

const ViewController = require("./view-controller");
const RestController = require("./rest-controller");
const LogController = require("./log-controller");
const JobController = require("./job-controller");

JobController.registerJobs();

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'pug')

app.get('/', ViewController.index);

app.post('/stop', RestController.stop);

app.post('/addJob', RestController.addJob);
app.post('/deleteJob', RestController.deleteJob);
app.post('/clearJobs', RestController.clearJobs);

app.listen(3000, () => {
    LogController.info("SERVER", "RUNNING", {address: "http://localhost:3000"});
});
