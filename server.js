require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const shell = require('shelljs');
const app = express();

app.use(express.json({
  verify: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  },
}));

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // Token is loaded from .env file

function verifyGitHubPayload(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).send('No signature found.');
  }

    const sigParts = signature.split('=');
    const hmac = crypto.createHmac(sigParts[0], WEBHOOK_SECRET);
    const digest = Buffer.from(`${sigParts[0]}=${hmac.update(req.rawBody).digest('hex')}`, 'utf8');
  const checksum = Buffer.from(signature, 'utf8');

  if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
    return res.status(401).send('Mismatched signatures.');
  }

  next(); // If verification passes, move to the next middleware
}

app.post('/webhook', verifyGitHubPayload, (req, res) => {
  const eventType = req.header('X-GitHub-Event');

  if (eventType === 'package' && req.body.action === 'updated') {
    console.log('Received package updated event from GitHub, updating Docker...');
    let stdout = shell.exec('docker compose -f /srv/sites/docker-compose.yml pull', { silent: true }).stdout;
    let stderr = shell.exec('docker compose -f /srv/sites/docker-compose.yml up -d', { silent: true }).stderr;

    if (stderr) {
      console.error(stderr); // Outputs to the server's console
      return res.status(500).send(stderr); // Sends stderr back to the client
    }

    console.log(stdout); // Outputs to the server's console
    return res.status(200).send('Docker service is being updated!\n' + stdout); // Sends stdout back to the client
  } else if (eventType === 'ping') {
    console.log('Ping event received from GitHub');
    return res.status(200).send('Ping event received and acknowledged.');
  } else {
    // Handle other events or error
    return res.status(400).send('Unrecognized event type');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});