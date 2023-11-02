const DB = require('node-json-db');
const hash = require('object-hash');
const {dbFile} = require("./contants");

const db = new DB.JsonDB(new DB.Config(dbFile, true, false, '/'));

module.exports = class DbController {

    static JOB_TABLE = "job";

    static async getIndex(id) {
        const index = await db.getIndex(`/${this.JOB_TABLE}`, id);
        if (index === -1) {
            throw Error(`Index error {id: "${id}"}`);
        }
        return index;
    }

    static async getJob(id) {
        const index = await DbController.getIndex(id);
        return await db.getData(`/${this.JOB_TABLE}[${index}]`);
    }

    static async insertJob(job) {
        const newJob = {...job, ...{id: hash(job)}};
        await db.push(`/${this.JOB_TABLE}[]`, newJob);
        return newJob;
    }

    static async updateJob(id, patch) {
        const job = await DbController.getJob(id);
        const index = await DbController.getIndex(id);
        const newJob = {...job, ...patch};
        await db.push(`/${this.JOB_TABLE}[${index}]`, newJob, true);
        return newJob;
    }

    static async deleteJob(id) {
        const index = await DbController.getIndex(id);
        return await db.delete(`/${this.JOB_TABLE}[${index}]`);
    }

    static async clearFinishedJobs() {
        const finishedJobs = await DbController.getFinishedJobs();
        if (finishedJobs.length === 0) {
            return true;
        }

        for (const job of finishedJobs) {
            await DbController.deleteJob(job.id);
        }
        return true;
    }

    static async clearJobs() {
        return await db.delete(`/${this.JOB_TABLE}`);
    }

    static async getJobs() {
        return await db.getObjectDefault(`/${this.JOB_TABLE}`, []);
    }

    static async getFinishedJobs() {
        try {
            return await db.filter(`/${this.JOB_TABLE}`, (entry) => entry.status);
        } catch (e) {
            return [];
        }
    }

    static async getUnrecordedJobs() {
        try {
            return await db.filter(`/${this.JOB_TABLE}`, (entry) => !entry.status);
        } catch (e) {
            return [];
        }
    }
}
