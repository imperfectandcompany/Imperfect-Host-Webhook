require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const shell = require('shelljs');
const app = express();

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Middleware for JSON body parsing and signature verification
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  }
}));

// Logger function that enhances logs with trace IDs and timestamps
function logWithTraceId(traceId, message) {
  console.log(`[${new Date().toISOString()}][${traceId}]: ${message}`);
}

// Middleware to validate GitHub webhook signatures
function verifyGitHubPayload(req, res, next) {
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
}

// Modular function to handle Docker operations
async function updateDockerServices() {
  const pullResult = await shell.exec(`docker compose -f /srv/sites/docker-compose.yml --env-file /srv/sites/.env pull`, { silent: true });
  if (pullResult.code !== 0) {
    throw new Error(`Docker pull failed: ${pullResult.stderr}`);
  }

  if (pullResult.stdout.includes('Image is up to date')) {
    return 'Docker images are up to date. No update needed.';
  }

  const upResult = await shell.exec(`docker compose -f /srv/sites/docker-compose.yml --env-file /srv/sites/.env up -d`, { silent: true });
  if (upResult.code !== 0) {
    throw new Error(`Docker up failed: ${upResult.stderr}`);
  }

  return 'Docker service updated successfully.';
}

// Route to handle webhook events
app.post('/webhook', verifyGitHubPayload, async (req, res) => {
  const eventType = req.header('X-GitHub-Event');
  logWithTraceId(req.traceId, `Received event: ${eventType}, action: ${req.body.action}`);

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

app.listen(PORT, () => {
  logWithTraceId('system', `Server is running on port ${PORT}`);
  shell.exec(`docker compose -f /srv/sites/docker-compose.yml --env-file /srv/sites/.env up -d`, { silent: true }, (error, stdout, stderr) => {
    if (error) {
      logWithTraceId('system', `Error initializing Docker services: ${error.message}`);
    } else {
      logWithTraceId('system', 'Docker services initialized at startup.');
    }
  });
});