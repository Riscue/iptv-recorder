const express = require('express');

const ViewController = require("./view-controller");
const RestController = require("./rest-controller");

const app = express();
app.use(express.json())
app.set('view engine', 'pug')

app.get('/', ViewController.index);

app.post('/stop', RestController.stop);

app.get('/job', RestController.getJobs);
app.post('/job', RestController.postJob);
app.delete('/job', RestController.deleteJob);

app.listen(3000, () => {
    console.log(`Server is running at http://localhost:3000`);
});
