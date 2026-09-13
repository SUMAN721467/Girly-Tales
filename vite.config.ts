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
              const keyId = env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
              const keySecret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

              if (!keyId || !keySecret) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    error: 'Razorpay credentials not configured in environment.',
                  })
                );
                return;
              }

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
              const keySecret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

              if (!keySecret) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: false,
                    error: 'RAZORPAY_KEY_SECRET is not configured in environment.',
                  })
                );
                return;
              }

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

        if (url === '/api/send-email' && req.method === 'POST') {
          let rawData = '';
          req.on('data', (chunk: any) => {
            rawData += chunk;
          });

          req.on('end', async () => {
            try {
              const body = JSON.parse(rawData || '{}');
              const env = loadEnv('development', process.cwd(), '');
              const apiKey = (env.RESEND_API_KEY || process.env.RESEND_API_KEY || '').trim();
              const defaultFrom = env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'admin@girlytales.in';

              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'RESEND_API_KEY is not configured in .env' }));
                return;
              }

              const { to, subject, html, from, replyTo } = body;
              if (!to || !subject || !html) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Missing required fields: to, subject, html' }));
                return;
              }

              const toList = Array.isArray(to) ? to : [to];
              const sender = from || `Girly Tales <${defaultFrom}>`;

              const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: sender,
                  to: toList,
                  subject,
                  html,
                  ...(replyTo ? { reply_to: replyTo } : {}),
                }),
              });

              const data = await resendRes.json();
              res.statusCode = resendRes.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: resendRes.ok, data }));
            } catch (e: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: e?.message || 'Failed to dispatch email' }));
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
    proxy: {
      '/supabase-proxy': {
        target: 'https://luidwbslkwzkdetodqte.supabase.co',
        changeOrigin: true,
        secure: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/supabase-proxy/, ''),
        configure: (proxy: any) => {
          proxy.on('proxyReq', (proxyReq: any) => {
            // Strip bulky localhost browser cookies to prevent HTTP 431 Request Header Fields Too Large
            proxyReq.removeHeader('cookie');
          });
        },
      },
    },
  },
  preview: {
    port: 3001,
    proxy: {
      '/supabase-proxy': {
        target: 'https://luidwbslkwzkdetodqte.supabase.co',
        changeOrigin: true,
        secure: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/supabase-proxy/, ''),
        configure: (proxy: any) => {
          proxy.on('proxyReq', (proxyReq: any) => {
            proxyReq.removeHeader('cookie');
          });
        },
      },
    },
  },
});

