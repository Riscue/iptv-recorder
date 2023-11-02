module.exports = class LogController {

    static info(entity, action, object) {
        console.log(JSON.stringify({timestamp: new Date(), entity, action, object, severity: "info"}));
    }

    static error(entity, action, log) {
        console.error(JSON.stringify({timestamp: new Date(), entity, action, log, severity: "error"}));
    }
}
