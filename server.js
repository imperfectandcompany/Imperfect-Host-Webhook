require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const shell = require('shelljs');
const app = express();
const bodyParser = require('body-parser');
const https = require('https');
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const TEBEX_SECRET = process.env.TEBEX_SECRET;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// Log environment variables to verify they are loaded correctly
console.log('WEBHOOK_SECRET:', WEBHOOK_SECRET);
console.log('TEBEX_SECRET:', TEBEX_SECRET);
console.log('DISCORD_WEBHOOK:', DISCORD_WEBHOOK);

// Middleware for JSON body parsing and signature verification
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
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

// Middleware to validate Tebex webhook signatures
function verifyTebexPayload(req, res, next) {
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
}

const sendDiscordMessage = (message, callback) => {
  const postData = JSON.stringify({ content: message });

  const options = {
    hostname: 'discord.com',
    port: 443,
    path: `/api/webhooks/${process.env.DISCORD_WEBHOOK}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  console.log("Request Options:", options); // Log the complete request setup
  console.log("Payload:", postData); // Log the actual data being sent

  const request = https.request(options, (response) => {
    let responseData = '';

    response.on('data', (chunk) => {
      responseData += chunk;
    });

    response.on('end', () => {
      console.log(`Discord Response: ${responseData} Status: ${response.statusCode}`);
      if (response.statusCode === 204) {
        callback(null, 'Message sent to Discord');
      } else {
        callback(new Error(`Failed to send message to Discord with status ${response.statusCode}: ${responseData}`));
      }
    });
  });

  request.on('error', (error) => {
    console.error(`HTTP Request Error: ${error}`);
    callback(error);
  });

  request.write(postData);
  request.end();
};


function handlePaymentCompleted(event, res) {
  logWithTraceId(event.id, `Payment completed: ${JSON.stringify(event.subject)}`);
  sendDiscordMessage("Payment received", (error, result) => {
    if (error) {
      console.error('Error sending message to Discord:', error);
      res.status(500).send('Error sending message to Discord');
    } else {
      res.status(200).send(result);
    }
  });
}

async function handleTebexValidation(event) {
  logWithTraceId(event.id, `Validation completed: ${JSON.stringify(event.subject)}`);
  return new Promise((resolve, reject) => {
    sendDiscordMessage("Validation test from Tebex successful!", (error, result) => {
      if (error) {
        console.error('Error sending message to Discord:', error);
        reject(error);
      } else {
        console.log(result);
        resolve();
      }
    });
  });
}


function handlePaymentDeclined(event) {
  logWithTraceId(event.id, `Payment declined: ${JSON.stringify(event.subject)}`);
}

function handlePaymentRefunded(event) {
  logWithTraceId(event.id, `Payment refunded: ${JSON.stringify(event.subject)}`);
}

const allowedIPs = ['18.209.80.3', '54.87.231.232'];

function normalizeIP(ip) {
  if (ip.substr(0, 7) === "::ffff:") {
    return ip.substr(7);
  }
  return ip;
}

function verifyIP(req, res, next) {
  let senderIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  senderIP = normalizeIP(senderIP); // Normalize to IPv4 format if in IPv6 mapped format
  if (allowedIPs.includes(senderIP)) {
    next();
  } else {
    logWithTraceId(req.traceId, `Unauthorized access attempt from IP: ${senderIP}`);
    res.status(404).send('Not Found');
  }
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

app.post('/tebex', verifyIP, (req, res, next) => {
  console.log('Headers:', req.headers); // Log all headers to debug
  next();
}, verifyTebexPayload, async (req, res) => {
  logWithTraceId(req.traceId, 'Received valid Tebex webhook event.');

  const webhookEvent = req.body;
  logWithTraceId(req.traceId, `Webhook event type: ${webhookEvent.type}`);

  try {
    switch (webhookEvent.type) {
      case 'validation.webhook':
        await handleTebexValidation(webhookEvent);
        break;
      case 'payment.completed':
        await handlePaymentCompleted(webhookEvent);
        break;
      case 'payment.declined':
        await handlePaymentDeclined(webhookEvent);
        break;
      case 'payment.refunded':
        await handlePaymentRefunded(webhookEvent);
        break;
      // Add additional cases for other webhook types
      default:
        logWithTraceId(req.traceId, `Unhandled webhook event type: ${webhookEvent.type}`);
    }
      
    if (webhookEvent.id) {
      res.status(200).json({ id: webhookEvent.id });
    } else {
      // Optionally, handle the case where ID is missing or log the occurrence
      logWithTraceId(req.traceId, 'Warning: Webhook event ID missing.');
      res.status(200).json({ message: 'Webhook received and verified, but ID was missing.' });
    }
      
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
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
