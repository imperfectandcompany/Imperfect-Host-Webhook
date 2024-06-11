// /services/paymentServices.js

const axios = require('axios');
const { logWithTraceId, sendDiscordMessage } = require('../utils');

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
  logWithTraceId(event.id, `Payment completed: ${JSON.stringify(event.subject)}`);
  
  const userId = event.cart.products[0].custom.user_id;
  const steamId = event.cart.products[0].custom.steam_id;
  const username = event.cart.products[0].custom.username;
  const email = event.customer.email;
  const url = `https://api.imperfectgamers.org/premium/update/user/${userId}/true`;

  try {
    const response = await axios.put(url, {
      steam_id: steamId,
      username: username,
      email: email
    });

    if (response.status === 200 && response.data.status === 'success') {
      logWithTraceId(event.id, 'Premium status updated successfully');
      try {
        await sendDiscordMessage("Payment received");
        res.status(200).send('Premium status updated successfully');
      } catch (error) {
        console.error('Error sending message to Discord:', error);
        res.status(500).send('Error sending message to Discord');
      }
    } else {
      throw new Error('Failed to update premium status');
    }
  } catch (error) {
    console.error('Error updating premium status:', error);
    res.status(500).send('Error updating premium status');
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
  const url = `https://api.imperfectgamers.org/premium/update/user/${userId}/false`;

  try {
    const response = await axios.put(url, {
      steam_id: steamId,
      username: username,
      email: email
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
