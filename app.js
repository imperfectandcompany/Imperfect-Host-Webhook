require('dotenv').config(); // Load environment variables at the top

const express = require('express');
const shell = require('shelljs');
const bodyParser = require('body-parser');
const { PORT } = require('./config');
const webhookRoutes = require('./routes/webhookRoutes');
const tebexRoutes = require('./routes/tebexRoutes');
const { logWithTraceId } = require('./utils/logger');

const app = express();

// Middleware for JSON body parsing and signature verification
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use('/webhook', webhookRoutes);
app.use('/tebex', tebexRoutes);

// Centralized error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
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
