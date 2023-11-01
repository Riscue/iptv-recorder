const express = require('express');
const bodyParser = require('body-parser');

const ViewController = require("./view-controller");
const RestController = require("./rest-controller");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'pug')

app.get('/', ViewController.index);

app.post('/stop', RestController.stop);

app.post('/addJob', RestController.addJob);
app.post('/deleteJob', RestController.deleteJob);
app.post('/clearJobs', RestController.clearJobs);

app.listen(3000, () => {
    console.log(`Server is running at http://localhost:3000`);
});
