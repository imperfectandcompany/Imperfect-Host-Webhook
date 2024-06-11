const crypto = require('crypto');
const { WEBHOOK_SECRET } = require('../config');

module.exports = function verifyGitHubPayload(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: 'No signature found.' });
  }

  const [algo, hash] = signature.split('=');
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(req.rawBody);
  const digest = hmac.digest('hex');

  if (hash !== digest) {
    return res.status(401).json({ error: 'Mismatched signatures.' });
  }

  req.traceId = `trace-${Date.now()}`;
  next();
};

