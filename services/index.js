// /services/index.js

const updateDockerServices = require('./dockerServices').updateDockerServices;

const {
  handleTebexValidation,
  handlePaymentCompleted,
  handlePaymentDeclined,
  handlePaymentRefunded
} = require('./paymentServices');

// Export all payment-related functions as part of the paymentServices object
module.exports = {
  updateDockerServices,
  paymentServices: {
    handleTebexValidation,
    handlePaymentCompleted,
    handlePaymentDeclined,
    handlePaymentRefunded,
  }
};