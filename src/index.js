const express = require('express');
const moment = require('moment');

const WebController = require("./web-controller");

const app = express();

app.get('/', WebController.index);
app.get('/job', WebController.getJobs);
app.post('/job', WebController.postJob);

app.listen(3000, () => {
    console.log(`Server is running at http://localhost:3000`);
});
