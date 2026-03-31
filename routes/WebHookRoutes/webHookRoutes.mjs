// routes/razorpay.js or in your controller file
import express from 'express';
import crypto from 'crypto';
import razorpayInstance from '../../Config/razorpay.mjs'; // your instance
import PaymentController from '../../controllers/User/PaymentController.mjs';
import { Router } from 'express';
const router = Router();

// Important: Use raw body for signature verification
router.post('/api/razorpay/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET; // Different from KEY_SECRET

    if (!signature || !webhookSecret) {
        return res.status(400).json({ success: false, message: "Missing signature" });
    }

    // Verify webhook signature
    const isValid = validateWebhookSignature(req.body, signature, webhookSecret);

    if (!isValid) {
        console.error("Invalid webhook signature");
        return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event = JSON.parse(req.body.toString()); // Now parse it from buffer
    const { event: eventName, payload } = event;

    try {
        switch (eventName) {
            case 'payment.authorized':
                await PaymentController.handlePaymentAuthorized(payload);
                break;

            case 'payment.captured':
            case 'order.paid':
                await PaymentController.handlePaymentSuccess(payload);
                break;

            case 'payment.failed':
                await PaymentController.handlePaymentFailed(payload);
                break;

            default:
                console.log(`Unhandled event: ${eventName}`);
        }

        res.status(200).json({ success: true }); // Always return 200 quickly
    } catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).json({ success: false });
    }
});

// Helper function for signature validation
function validateWebhookSignature(body, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    return expectedSignature === signature;
}

export default router;