const axios = require('axios');
const fs = require('fs');
const M3U8FileParser = require('m3u8-file-parser');

const {playlistUrl, playlistFile} = require("./contants");

module.exports = class M3U8Controller {

    static async prepare() {
        if (fs.existsSync(playlistFile)) {
            return;
        }

        await M3U8Controller.download(playlistUrl, playlistFile);
    }

    static find(channelName) {
        const content = fs.readFileSync(playlistFile, {encoding: 'utf-8'});
        const parser = new M3U8FileParser();
        parser.read(content);
        const playlist = parser.getResult();
        const filter = playlist.segments.filter(item => item.inf.title.toLowerCase().includes(channelName.toLowerCase()));
        return filter.length === 0 ? undefined : filter[0];
    }

    static async download(url, path) {
        const writer = fs.createWriteStream(path);

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }
}
