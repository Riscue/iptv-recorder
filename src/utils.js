const {downloadFolder} = require("./contants");
const moment = require("moment");
module.exports = {
    getFileName: function (title) {
        return `${downloadFolder}/${title.trim().replace(/[ \/\\:]+/g, '-')}-${moment(new Date()).format('yyyy-MM-DD-HH-mm-ss')}.mp4`;
    }
}
