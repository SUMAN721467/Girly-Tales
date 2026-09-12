import https from 'https';

/**
 * Serverless / Node handler to create a Razorpay Order
 * Endpoint: POST /api/create-order
 */
export default async function handler(req, res) {
  // Allow POST only
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.status(500).json({
      error: 'Razorpay API credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.',
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

  const { amount, currency = 'INR', receipt, notes } = body || {};

  // Validate amount (must be in paise, integer >= 100 paise = ₹1)
  const numericAmount = Math.round(Number(amount));
  if (!numericAmount || isNaN(numericAmount) || numericAmount < 100) {
    return res.status(400).json({
      error: 'Amount is required and must be at least 100 paise (₹1.00).',
    });
  }

  const orderPayload = JSON.stringify({
    amount: numericAmount,
    currency: currency.toUpperCase(),
    receipt: receipt || `rcpt_${Date.now()}`,
    payment_capture: 1,
    notes: notes || {},
  });

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.razorpay.com',
      port: 443,
      path: '/v1/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(orderPayload),
        'Authorization': authHeader,
      },
    };

    const rzpReq = https.request(options, (rzpRes) => {
      let data = '';
      rzpRes.on('data', (chunk) => {
        data += chunk;
      });

      rzpRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (rzpRes.statusCode >= 200 && rzpRes.statusCode < 300) {
            res.status(200).json({
              order_id: parsed.id,
              id: parsed.id,
              amount: parsed.amount,
              currency: parsed.currency,
              receipt: parsed.receipt,
              status: parsed.status,
            });
            resolve();
          } else {
            console.error('Razorpay Order API error response:', parsed);
            res.status(rzpRes.statusCode || 500).json({
              error: parsed.error?.description || 'Failed to create Razorpay order',
              details: parsed,
            });
            resolve();
          }
        } catch (err) {
          console.error('Error parsing Razorpay response:', err);
          res.status(500).json({ error: 'Failed to process Razorpay response' });
          resolve();
        }
      });
    });

    rzpReq.on('error', (err) => {
      console.error('Razorpay request error:', err);
      res.status(500).json({ error: 'Network error connecting to Razorpay' });
      resolve();
    });

    rzpReq.write(orderPayload);
    rzpReq.end();
  });
}
