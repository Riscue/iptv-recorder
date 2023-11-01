const DB = require('node-json-db');
const hash = require('object-hash');

const db = new DB.JsonDB(new DB.Config("/tmp/db", true, false, '/'));

module.exports = class DbController {

    static JOB_TABLE = "job";

    static async clearJobs() {
        return await db.delete(`/${this.JOB_TABLE}`);
    }

    static async deleteJob(id) {
        return await db.delete(`/${this.JOB_TABLE}[${await db.getIndex(`/${this.JOB_TABLE}`, id)}]`);
    }

    static async insertJob(job) {
        job["id"] = hash(job);
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
