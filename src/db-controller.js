const DB = require('node-json-db');

const db = new DB.JsonDB(new DB.Config("myDataBase", true, false, '/'));

module.exports = class DbController {

    static JOB_TABLE = "job";

    static async clearJobs() {
        return await db.delete(`/${this.JOB_TABLE}`);
    }

    static async insertJob(job) {
        return await db.push(`/${this.JOB_TABLE}[]`, job);
    }

    static async getJobs() {
        try {
            return await db.getData(`/${this.JOB_TABLE}`);
        } catch (e) {
            return [];
        }
    }
}
