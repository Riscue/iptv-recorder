const {downloadFolder} = require("./contants");
const moment = require("moment");
module.exports = {
    getFileName: function (title, date) {
        return `${downloadFolder}/${title.trim().replace(/[ \/\\:]+/g, '-')}-${date.format('yyyy-MM-DD-HH-mm-ss')}.m3u8`;
    }
}
