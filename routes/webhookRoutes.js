const express = require('express');
const router = express.Router();
const { verifyGitHubPayload } = require('../middleware');
const { updateDockerServices, logWithTraceId } = require('../utils');

router.post('/', verifyGitHubPayload, async (req, res) => {
  const eventType = req.header('X-GitHub-Event');
  logWithTraceId(req.traceId, `Received event: ${eventType}, action: ${req.body.action}`);
    
  if (eventType === 'ping') {
    logWithTraceId(req.traceId, 'Received ping event from GitHub.');
    return res.status(200).json({ message: 'Ping event received successfully.' });
  }

  if (eventType === 'package' && ['updated', 'published'].includes(req.body.action)) {
    try {
      const message = await updateDockerServices();
      logWithTraceId(req.traceId, message);
      res.status(200).json({ message });
    } catch (error) {
      logWithTraceId(req.traceId, `Error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  } else {
    logWithTraceId(req.traceId, 'Unrecognized event.');
    res.status(400).json({ error: 'Unrecognized event type' });
  }
});

module.exports = router;
