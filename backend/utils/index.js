const moment = require('moment');

module.exports.formatMessage = function (username, text) {
    return {
        username,
        text,
        time: moment().format('h:mm a')
    }
}