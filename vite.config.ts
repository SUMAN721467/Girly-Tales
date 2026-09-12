import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'https';
import crypto from 'crypto';

function razorpayDevPlugin() {
  return {
    name: 'vite-plugin-razorpay-dev',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0];

        if (url === '/api/create-order' && req.method === 'POST') {
          let rawData = '';
          req.on('data', (chunk: any) => {
            rawData += chunk;
          });

          req.on('end', () => {
            try {
              const body = JSON.parse(rawData || '{}');
              const env = loadEnv('development', process.cwd(), '');
              const keyId = env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_TbD8G3ANJoWXsX';
              const keySecret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || 'aH6l1sHOyCCFjEPtriDPDBqx';

              const numericAmount = Math.round(Number(body.amount));
              if (!numericAmount || isNaN(numericAmount) || numericAmount < 100) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    error: 'Amount is required and must be at least 100 paise (₹1.00).',
                  })
                );
                return;
              }

              const orderPayload = JSON.stringify({
                amount: numericAmount,
                currency: (body.currency || 'INR').toUpperCase(),
                receipt: body.receipt || `rcpt_${Date.now()}`,
                payment_capture: 1,
                notes: body.notes || {},
              });

              const authHeader =
                'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

              const rzpReq = https.request(
                {
                  hostname: 'api.razorpay.com',
                  port: 443,
                  path: '/v1/orders',
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(orderPayload),
                    Authorization: authHeader,
                  },
                },
                (rzpRes) => {
                  let data = '';
                  rzpRes.on('data', (c) => {
                    data += c;
                  });

                  rzpRes.on('end', () => {
                    try {
                      const parsed = JSON.parse(data);
                      res.statusCode = rzpRes.statusCode || 200;
                      res.setHeader('Content-Type', 'application/json');
                      if (rzpRes.statusCode && rzpRes.statusCode >= 200 && rzpRes.statusCode < 300) {
                        res.end(
                          JSON.stringify({
                            order_id: parsed.id,
                            id: parsed.id,
                            amount: parsed.amount,
                            currency: parsed.currency,
                            receipt: parsed.receipt,
                            status: parsed.status,
                          })
                        );
                      } else {
                        res.end(
                          JSON.stringify({
                            error:
                              parsed.error?.description ||
                              'Failed to create Razorpay order',
                            details: parsed,
                          })
                        );
                      }
                    } catch (e) {
                      res.statusCode = 500;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(
                        JSON.stringify({
                          error: 'Failed to parse Razorpay response',
                        })
                      );
                    }
                  });
                }
              );

              rzpReq.on('error', (err) => {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    error: 'Network error connecting to Razorpay: ' + err.message,
                  })
                );
              });

              rzpReq.write(orderPayload);
              rzpReq.end();
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid request body' }));
            }
          });
          return;
        }

        if (url === '/api/verify-payment' && req.method === 'POST') {
          let rawData = '';
          req.on('data', (chunk: any) => {
            rawData += chunk;
          });

          req.on('end', () => {
            try {
              const body = JSON.parse(rawData || '{}');
              const env = loadEnv('development', process.cwd(), '');
              const keySecret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || 'aH6l1sHOyCCFjEPtriDPDBqx';

              const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
              if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: false,
                    error: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, razorpay_signature',
                  })
                );
                return;
              }

              const text = `${razorpay_order_id}|${razorpay_payment_id}`;
              const generated_signature = crypto
                .createHmac('sha256', keySecret)
                .update(text)
                .digest('hex');

              res.setHeader('Content-Type', 'application/json');
              if (generated_signature === razorpay_signature) {
                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    success: true,
                    message: 'Payment verified successfully',
                    order_id: razorpay_order_id,
                    payment_id: razorpay_payment_id,
                  })
                );
              } else {
                res.statusCode = 400;
                res.end(
                  JSON.stringify({
                    success: false,
                    error: 'Signature verification failed',
                  })
                );
              }
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error: 'Internal error verifying signature',
                })
              );
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), razorpayDevPlugin()],
  server: {
    port: 3000,
    open: true,
  },
});
