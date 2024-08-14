const { logWithTraceId } = require('../utils/logger');

const allowedIPs = ['18.209.80.3', '54.87.231.232'];

function normalizeIP(ip) {
    if (ip.startsWith("::ffff:")) {
        return ip.substr(7);
    }
    return ip;
}

module.exports = function verifyIP(req, res, next) {
    let senderIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    senderIP = normalizeIP(senderIP);
    if (allowedIPs.includes(senderIP)) {
        next();
    } else {
        logWithTraceId(req.traceId, `Unauthorized access attempt from IP: ${senderIP}`);
        res.status(404).send('Not Found');
    }
};
