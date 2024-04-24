require('dotenv').config();
const express = require('express');
const shell = require('shelljs');
const app = express();

app.use(express.json()); // Middleware to parse JSON

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.WEBHOOK_TOKEN; // Token is loaded from .env file

app.post('/webhook', (req, res) => {
  if (req.header('X-GitHub-Token') !== TOKEN) {
    console.log(`Expected token: ${TOKEN}`);
      console.log(`Received token: ${req.header('X-GitHub-Token')}`);
    return res.status(403).send('Forbidden'); // Simple auth check
  }
  
  if (req.body && req.body.action === 'pushed') {
    console.log('Received push event from GitHub, updating Docker...');
    let stdout = shell.exec('docker compose -f /srv/sites/docker-compose.yml pull', { silent: true }).stdout;
    let stderr = shell.exec('docker compose -f /srv/sites/docker-compose.yml up -d', { silent: true }).stderr;

    if (stderr) {
      console.error(stderr); // Outputs to the server's console
      return res.status(500).send(stderr); // Sends stderr back to the client
    }

    console.log(stdout); // Outputs to the server's console
    return res.status(200).send('Docker service is being updated!\n' + stdout); // Sends stdout back to the client
  }
  
  res.status(400).send('Invalid request');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});