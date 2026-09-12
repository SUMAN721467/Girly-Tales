import crypto from 'crypto';

/**
 * Serverless / Node handler to verify Razorpay Payment Signature
 * Endpoint: POST /api/verify-payment
 */
export default async function handler(req, res) {
  // Allow POST only
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    return res.status(500).json({
      error: 'RAZORPAY_KEY_SECRET is not configured on the server.',
    });
  }

  // Parse request body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON request body' });
    }
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required.',
    });
  }

  try {
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid signature. Payment verification failed.',
      });
    }
  } catch (err) {
    console.error('Signature verification error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal error verifying payment signature',
    });
  }
}
