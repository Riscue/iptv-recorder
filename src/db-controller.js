const DB = require('node-json-db');
const hash = require('object-hash');
const {dbFile} = require("./contants");

const db = new DB.JsonDB(new DB.Config(dbFile, true, false, '/'));

module.exports = class DbController {

    static JOB_TABLE = "job";

    static async clearJobs() {
        return await db.delete(`/${this.JOB_TABLE}`);
    }

    static async getJob(id) {
        return await db.getData(`/${this.JOB_TABLE}[${await db.getIndex(`/${this.JOB_TABLE}`, id)}]`);
    }

    static async deleteJob(id) {
        return await db.delete(`/${this.JOB_TABLE}[${await db.getIndex(`/${this.JOB_TABLE}`, id)}]`);
    }

    static async insertJob(job) {
        job["id"] = hash(job);
        return await db.push(`/${this.JOB_TABLE}[]`, job);
    }

    static async updateJob(id, job) {
        return await db.push(`/${this.JOB_TABLE}[${await db.getIndex(`/${this.JOB_TABLE}`, id)}]`, job, true);
    }

    static async getJobs() {
        return await db.getObjectDefault(`/${this.JOB_TABLE}`, []);
    }

    static async getUnrecordedJobs() {
        try {
            return await db.filter(`/${this.JOB_TABLE}`, (entry) => entry.status === false);
        } catch (e) {
            return [];
        }
    }
}
