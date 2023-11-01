module.exports = class LogController {

    static info(entity, action, object) {
        console.log(JSON.stringify({entity, action, object, severity: "info"}));
    }

    static error(entity, action, errorLog) {
        console.error(JSON.stringify({entity, action, stackTrace: errorLog, severity: "error"}));
    }
}
