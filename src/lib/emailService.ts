/**
 * Resend Email Service for Girly Tales
 * Sends order confirmations and customer communications via Resend API
 */

const RESEND_API_KEY = (
  import.meta.env.VITE_RESEND_API_KEY ||
  import.meta.env.RESEND_API_KEY ||
  ''
).trim();

const FROM_EMAIL = import.meta.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export const EmailService = {
  isConfigured(): boolean {
    return Boolean(RESEND_API_KEY && RESEND_API_KEY.startsWith('re_'));
  },

  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.isConfigured()) {
      console.warn('[EmailService] Resend API key is not configured.');
      return { success: false, error: 'Resend API key missing' };
    }

    try {
      const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];
      const fromAddress = payload.from || `Girly Tales <${FROM_EMAIL}>`;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: toAddresses,
          subject: payload.subject,
          html: payload.html,
          ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[EmailService Error]', data);
        return { success: false, error: data?.message || 'Failed to send email' };
      }

      console.log('[EmailService Success]', data);
      return { success: true, data };
    } catch (err: any) {
      console.error('[EmailService Exception]', err);
      return { success: false, error: err?.message || 'Network error sending email' };
    }
  },

  async sendOrderConfirmation(order: {
    id: string;
    customerName: string;
    email: string;
    total: number;
    items: Array<{ name: string; quantity: number; price: number; selectedSize?: string }>;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    paymentMethod?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!order.email) return { success: false, error: 'Recipient email required' };

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f0ece1;">
            <strong style="color: #2D2D2D;">${item.name}</strong>
            ${item.selectedSize ? `<br/><span style="font-size: 12px; color: #8C827A;">Size: ${item.selectedSize}</span>` : ''}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f0ece1; text-align: center; color: #666;">
            x${item.quantity}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f0ece1; text-align: right; font-weight: bold; color: #967BB6;">
            ₹${(item.price * item.quantity).toLocaleString('en-IN')}
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FAF8F2; margin: 0; padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #EAE6DB; }
          .header { background: #967BB6; padding: 32px 24px; text-align: center; color: #ffffff; }
          .content { padding: 32px 24px; }
          .order-box { background: #FAF8F2; border-radius: 14px; padding: 18px; margin: 20px 0; }
          .footer { padding: 24px; text-align: center; font-size: 12px; color: #8C827A; border-top: 1px solid #EAE6DB; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 26px; font-weight: 300; letter-spacing: 2px;">GIRLY TALES</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Order Confirmation ✨</p>
          </div>
          <div class="content">
            <h2 style="color: #2D2D2D; font-size: 20px; margin-top: 0;">Thank you for your order, ${order.customerName}!</h2>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              We have received your order <strong>#${order.id}</strong>. Our team is already preparing your luxury Mulberry Silk & 18K Anti-Tarnish pieces with care.
            </p>

            <div class="order-box">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="color: #8C827A; text-align: left; font-size: 12px; text-transform: uppercase;">
                    <th style="padding-bottom: 8px;">Item</th>
                    <th style="padding-bottom: 8px; text-align: center;">Qty</th>
                    <th style="padding-bottom: 8px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div style="margin-top: 16px; padding-top: 12px; border-top: 2px solid #EAE6DB; display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #2D2D2D;">
                <span>Total Amount:</span>
                <span style="color: #967BB6; float: right;">₹${order.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            ${
              order.address
                ? `
              <div style="font-size: 13px; color: #666; margin-top: 18px; line-height: 1.5;">
                <strong style="color: #2D2D2D;">Delivery Address:</strong><br/>
                ${order.address}, ${order.city || ''} ${order.state || ''} - ${order.pincode || ''}<br/>
                <strong>Payment:</strong> ${order.paymentMethod || 'Prepaid'}
              </div>
            `
                : ''
            }

            <p style="color: #8C827A; font-size: 12px; margin-top: 24px; text-align: center;">
              You will receive tracking details as soon as your package is dispatched!
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Girly Tales India · 18K Anti-Tarnish Jewellery & Mulberry Silk Nightwear
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: order.email,
      subject: `Order Confirmed: #${order.id} - Girly Tales ✦`,
      html: htmlContent,
    });
  },
};
