// /services/paymentServices.js
const crypto = require('crypto');
const axios = require('axios');
const { logWithTraceId, sendDiscordMessage } = require('../utils');
const { IMPERFECTGAMERS_SECRET } = require('../config');

async function handleTebexValidation(event) {
  logWithTraceId(event.id, `Validation completed: ${JSON.stringify(event.subject)}`);
  try {
    await sendDiscordMessage("Validation test from Tebex successful!");
    console.log('Validation test from Tebex successful!');
  } catch (error) {
    console.error('Error sending message to Discord:', error);
    throw error;
  }
}

async function handlePaymentCompleted(event, res) {
    logWithTraceId(event.id, `Payment Completed: ${JSON.stringify(event.subject)}`);

    // Early exit if headers already sent
    if (res.headersSent) return;

    // Ensure 'products' are defined
    if (!event.subject.products || !event.subject.products.length) {
        console.error('Products data is missing or empty');
        return res.status(400).send('Invalid products data');
    }

    const { products } = event.subject;
    const product = products[0];
    const userId = event.subject.custom ? event.subject.custom.user_id : null;
    const steamId = event.subject.custom ? event.subject.custom.steam_id : null;
    const username = event.subject.custom ? event.subject.custom.username : null;
    const email = event.subject.customer.email;

    if (!userId || !steamId || !username) {
        console.error('Required user details are missing');
        return res.status(400).send('Missing user details in payload');
    }

    const payload = JSON.stringify({ steam_id: steamId, username, email });
    const secretKey = IMPERFECTGAMERS_SECRET;
    const signature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
    const url = `https://api.imperfectgamers.org/premium/update/user/${userId}/true`;

    try {
        const response = await axios.put(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': signature,
            },
        });

        if (response.status === 200 && response.data.status === 'success') {
            logWithTraceId(event.id, 'Premium status updated successfully');
            await sendDiscordMessage("Payment received");
            return res.status(200).send('Premium status updated successfully');
        }

        console.error(`Failed to update premium status: ${response.data.message}`);
        return res.status(response.status).send(`Failed to update premium status: ${response.data.message}`);
    } catch (error) {
        console.error(`Error updating premium status: ${error.message}`);
        if (!res.headersSent) {
            return res.status(500).send(`Error updating premium status: ${error.message}`);
        }
    }
}



function handlePaymentDeclined(event) {
  logWithTraceId(event.id, `Payment declined: ${JSON.stringify(event.subject)}`);
}

async function handlePaymentRefunded(event, res) {
  logWithTraceId(event.id, `Payment refunded: ${JSON.stringify(event.subject)}`);
  
  const userId = event.cart.products[0].custom.user_id;
  const steamId = event.cart.products[0].custom.steam_id;
  const username = event.cart.products[0].custom.username;
  const email = event.customer.email;
  const payload = JSON.stringify({ steam_id: steamId, username, email }, null, 2); // Ensure consistent formatting
  const secretKey = IMPERFECTGAMERS_SECRET;
  const signature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');    
  const url = `https://api.imperfectgamers.org/premium/update/user/${userId}/false`;

  try {
    const response = await axios.put(url, payload, {
        headers: {
            'Content-Type': 'application/json',
            'X-Signature': signature,
        },
    });

    if (response.status === 200 && response.data.status === 'success') {
      logWithTraceId(event.id, 'Premium status revoked successfully');
      try {
        await sendDiscordMessage("Payment refunded and premium status revoked");
        res.status(200).send('Premium status revoked successfully');
      } catch (error) {
        console.error('Error sending message to Discord:', error);
        res.status(500).send('Error sending message to Discord');
      }
    } else {
      throw new Error('Failed to revoke premium status');
    }
  } catch (error) {
    console.error('Error revoking premium status:', error);
    res.status(500).send('Error revoking premium status');
  }
}

module.exports = {
  handleTebexValidation,
  handlePaymentCompleted,
  handlePaymentDeclined,
  handlePaymentRefunded,
};
