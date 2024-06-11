const https = require('https');
const { DISCORD_WEBHOOK } = require('../config');

module.exports.sendDiscordMessage = function sendDiscordMessage(message, callback) {
    const postData = JSON.stringify({ content: message });

    const options = {
        hostname: 'discord.com',
        port: 443,
        path: `/api/webhooks/${DISCORD_WEBHOOK}`,  // Use the variable from config
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
