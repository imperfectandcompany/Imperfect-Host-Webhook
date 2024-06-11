const express = require('express');
const router = express.Router();
const { verifyIP, verifyTebexPayload } = require('../middleware');
const { logWithTraceId } = require('../utils');
const {
  handleTebexValidation,
  handlePaymentCompleted,
  handlePaymentDeclined,
  handlePaymentRefunded,
} = require('../services/paymentServices');

// Use router and relative path
router.post('/', verifyIP, (req, res, next) => {
    console.log('Headers:', req.headers); // Log all headers to debug
    next();
}, verifyTebexPayload, async (req, res) => {
    logWithTraceId(req.traceId, 'Received valid Tebex webhook event.');

    const webhookEvent = req.body;
    logWithTraceId(req.traceId, `Webhook event type: ${webhookEvent.type}`);

    try {
        let resultMessage = '';
        switch (webhookEvent.type) {
            case 'validation.webhook':
                resultMessage = await handleTebexValidation(webhookEvent);
                break;
            case 'payment.completed':
                resultMessage = await handlePaymentCompleted(webhookEvent, res);
                break;
            case 'payment.declined':
                handlePaymentDeclined(webhookEvent);
                resultMessage = 'Payment Declined';
                break;
            case 'payment.refunded':
                handlePaymentRefunded(webhookEvent);
                resultMessage = 'Payment Refunded';
                break;
            // Add additional cases for other webhook types
            default:
                logWithTraceId(req.traceId, `Unhandled webhook event type: ${webhookEvent.type}`);
                resultMessage = 'Unhandled Event';
        }

        if (webhookEvent.id) {
            res.status(200).json({ id: webhookEvent.id, message: resultMessage });
        } else {
            logWithTraceId(req.traceId, 'Warning: Webhook event ID missing.');
            res.status(200).json({ message: 'Webhook received and verified, but ID was missing.', detail: resultMessage });
        }

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Error processing webhook');
    }
});

module.exports = router;
