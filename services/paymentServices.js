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
  try {
    const result = await sendDiscordMessage("Payment received");
    res.status(200).send(result);
  } catch (error) {
    console.error('Error sending message to Discord:', error);
    res.status(500).send('Error sending message to Discord');
  }
}

function handlePaymentDeclined(event) {
  logWithTraceId(event.id, `Payment declined: ${JSON.stringify(event.subject)}`);
}

function handlePaymentRefunded(event) {
  logWithTraceId(event.id, `Payment refunded: ${JSON.stringify(event.subject)}`);
}

module.exports = {
  handleTebexValidation,
  handlePaymentCompleted,
  handlePaymentDeclined,
  handlePaymentRefunded,
};
