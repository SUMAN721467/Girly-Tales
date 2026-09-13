/**
 * Serverless / Node handler to send emails via Resend
 * Endpoint: POST /api/send-email
 *
 * Keeps RESEND_API_KEY strictly on the server; never exposed to client bundles.
 */

export default async function handler(req, res) {
  // Allow POST only
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const defaultFrom = process.env.RESEND_FROM_EMAIL || 'admin@girlytales.in';

  if (!apiKey) {
    return res.status(500).json({
      error: 'RESEND_API_KEY is not configured on the server.',
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

  const { to, subject, html, from, replyTo } = body || {};

  if (!to || !subject || !html) {
    return res.status(400).json({
      error: 'Missing required fields: to, subject, and html are all required.',
    });
  }

  const toList = Array.isArray(to) ? to : [to];
  const sender = from || `Girly Tales <${defaultFrom}>`;

  try {
    const resendPayload = {
      from: sender,
      to: toList,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[send-email API error from Resend]', data);
      return res.status(response.status).json({
        success: false,
        error: data?.message || 'Failed to send email via Resend',
        details: data,
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('[send-email API server exception]', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while sending email',
    });
  }
}
