const crypto = require('crypto');
const { TEBEX_SECRET } = require('../config');

module.exports = function verifyTebexPayload(req, res, next) {
  console.log('Incoming Headers:', req.headers); // Log all headers to debug
  console.log('Body:', req.body); // Log the body to debug

  if (!TEBEX_SECRET) {
    console.error('TEBEX_SECRET is not set!');
    return res.status(500).json({ error: 'Server configuration error. Please contact support.' });
  }

  const tebexHash = req.headers['x-signature'];
    
    
  if (!tebexHash) {
    console.error('No Tebex signature found.');
    return res.status(401).json({ error: 'No Tebex signature found.' });
  }

  const bodyHash = crypto.createHash('sha256')
    .update(req.rawBody)
    .digest('hex');

  try {
    const finalHash = crypto.createHmac('sha256', TEBEX_SECRET)
      .update(bodyHash)
      .digest('hex');

    if (finalHash !== tebexHash) {
      console.error('Mismatched Tebex signatures.');
      return res.status(401).json({ error: 'Mismatched Tebex signatures.' });
    }
  } catch (error) {
    console.error('Error creating HMAC:', error.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }

  req.traceId = `trace-${Date.now()}`;
  next();
};
