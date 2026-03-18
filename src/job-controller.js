const RecordController = require("./record-controller");
const ConvertController = require("./convert-controller");
const LogController = require("./log-controller");
const DbController = require("./db-controller");
const M3U8Controller = require("./m3u8-controller");
const {getFileName} = require("./utils");
const {maxRetryCount} = require("./contants");
const moment = require("moment/moment");
const fs = require("fs");

module.exports = class JobController {

    static registerJobs() {
        // Run checkTimeAndAct at exactly 00 seconds of each minute
        JobController.scheduleNextMinuteCheck();
        setInterval(JobController.checkRecordStatus, 10 * 1000);
        setInterval(JobController.checkConvertStatus, 10 * 1000);

        // Clean up orphaned jobs on startup (jobs marked as recording but no active process)
        setTimeout(JobController.cleanupOrphanedJobs, 1000);
    }

    static async cleanupOrphanedJobs() {
        try {
            const jobs = await DbController.getJobs();
            for (const job of jobs) {
                // Job is marked as recording but no active recording
                if (job.status && !job.record && !RecordController.isRecording) {
                    const jobEnd = new Date(job.endTimestamp);
                    const now = new Date();

                    // If recording time is not over yet, this is an orphaned job
                    // Try to restart it
                    if (now < jobEnd) {
                        LogController.info("JOB", "RESTART_ORPHAN", {
                            id: job.id,
                            channel: job.channelName,
                            endTime: jobEnd
                        });

                        // Try to restart the recording
                        const m3u8 = M3U8Controller.find(job.channelName);
                        if (m3u8) {
                            RecordController.job = job;
                            RecordController.start();

                            if (RecordController.isRecording) {
                                LogController.info("JOB", "RESTART_SUCCESS", {
                                    id: job.id,
                                    channel: job.channelName
                                });
                            } else {
                                // Failed to restart, reset to pending
                                LogController.error("JOB", "RESTART_FAILED", {
                                    id: job.id,
                                    channel: job.channelName
                                });
                                await DbController.updateJob(job.id, {
                                    status: false,
                                    record: undefined
                                });
                            }
                        } else {
                            // Channel not found, reset to pending
                            LogController.error("JOB", "CHANNEL_NOT_FOUND", {
                                id: job.id,
                                channel: job.channelName
                            });
                            await DbController.updateJob(job.id, {
                                status: false,
                                record: undefined
                            });
                        }
                    } else {
                        // Recording time is over, mark as completed with error
                        LogController.info("JOB", "ORPHAN_COMPLETED", {
                            id: job.id,
                            channel: job.channelName
                        });
                        await DbController.updateJob(job.id, {
                            status: false,
                            record: "ERROR"
                        });
                    }
                }
            }
        } catch (e) {
            LogController.error("JOB", "CLEANUP_ERROR", {error: e.message, stack: e.stack});
        }
    }

    static scheduleNextMinuteCheck() {
        const now = new Date();
        const secondsUntilNextMinute = 60 - now.getSeconds();
        const msUntilNextMinute = secondsUntilNextMinute * 1000 - now.getMilliseconds();

        setTimeout(() => {
            JobController.checkTimeAndAct();
            // Then run every minute
            setInterval(JobController.checkTimeAndAct, 60 * 1000);
        }, msUntilNextMinute);
    }

    static async checkTimeAndAct() {
        if (RecordController.isRecording && !!RecordController.recordProcess) {
            return;
        }

        // Get jobs that are waiting (status=false) AND errored jobs that need retry
        const jobs = await DbController.getUnrecordedJobs();
        if (jobs.length === 0) {
            return;
        }

        // Sort by start time
        const job = jobs.sort((a, b) => a.startTimestamp - b.startTimestamp)[0];

        // Check if it's time to start (or retry)
        const now = new Date();
        const jobStart = new Date(job.startTimestamp);

        // If job has errors, check if we should retry
        if (job.record === 'ERROR') {
            const retryCount = job.count || 0;
            if (retryCount >= maxRetryCount) {
                // Max retries reached, skip this job
                LogController.error("JOB", "MAX_RETRY", {id: job.id, channel: job.channelName});
                return;
            }
            // Retry errored jobs immediately
            RecordController.job = job;
            RecordController.start();
            if (RecordController.isRecording) {
                await DbController.updateJob(job.id, {
                    status: true,
                    record: undefined // Clear error status
                });
            }
            return;
        }

        // Normal job - wait for start time
        if (now > jobStart) {
            RecordController.job = job;
            RecordController.start();
            if (RecordController.isRecording) {
                await DbController.updateJob(job.id, {status: true});
            }
        }
    }

    static async checkRecordStatus() {
        if (RecordController.isRecording && !!RecordController.recordProcess) {
            if (RecordController.isRunning()) {
                // Check if recording time is over
                if (new Date() > RecordController.job.endTimestamp) {
                    const completedJob = await RecordController.stop();
                    // Start conversion only if recording was successful
                    if (completedJob && completedJob.record === 'SUCCESS') {
                        ConvertController.start(completedJob);
                    } else if (completedJob && completedJob.record === 'ERROR') {
                        LogController.error("JOB", "SKIPPING_CONVERT", {
                            reason: "Recording failed",
                            channel: completedJob.channelName
                        });
                    }
                }
            } else {
                // Process died unexpectedly - handle error
                LogController.error("RECORD", "UNEXPECTED", {
                    stdout: RecordController.recordProcess.stdoutLog,
                    stderr: RecordController.recordProcess.stderrLog,
                    pid: RecordController.recordProcess.pid
                });

                if (RecordController.job) {
                    const retryCount = (RecordController.job.count || 0) + 1;

                    // If max retries not reached, reset status for retry
                    if (retryCount < maxRetryCount) {
                        await DbController.updateJob(RecordController.job.id, {
                            status: false, // Reset to pending for retry
                            record: "ERROR",
                            fileName: getFileName(RecordController.job.channelName, moment(new Date())),
                            count: retryCount
                        });
                        LogController.info("JOB", "WILL_RETRY", {
                            id: RecordController.job.id,
                            retry: retryCount,
                            max: maxRetryCount
                        });
                    } else {
                        // Max retries reached - mark as permanently failed
                        await DbController.updateJob(RecordController.job.id, {
                            status: true,
                            record: "ERROR",
                            fileName: getFileName(RecordController.job.channelName, moment(new Date())),
                            count: retryCount
                        });
                        LogController.error("JOB", "PERMANENT_ERROR", {
                            id: RecordController.job.id,
                            retries: retryCount
                        });
                    }
                }

                RecordController.isRecording = false;
                RecordController.recordProcess = undefined;
                RecordController.job = undefined;
            }
        }
    }

    static async checkConvertStatus() {
        // If conversion is not running, check for pending conversions
        if (!ConvertController.isConverting) {
            // Find jobs that are recorded but not yet converted
            const jobs = await DbController.getJobs();
            for (const job of jobs) {
                if (job.status && job.record === 'SUCCESS' && !job.mp4Path && job.fileName) {
                    // This job is recorded but not converted yet
                    if (fs.existsSync(job.fileName)) {
                        LogController.info("CONVERT", "AUTO_START", {channel: job.channelName});
                        ConvertController.start(job);
                        break; // Only convert one at a time
                    }
                }
            }
        }
    }
}
