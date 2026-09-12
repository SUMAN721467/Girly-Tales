/**
 * Razorpay Standard Web Checkout Integration Service
 * Handles script injection, order creation, modal invocation, and signature verification.
 */

export interface RazorpayOrderResponse {
  order_id: string;
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status?: string;
  error?: string;
}

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface CheckoutCustomerDetails {
  name: string;
  email: string;
  phone: string;
}

export interface InitiatePaymentParams {
  amountInRupees: number;
  receiptId?: string;
  customer: CheckoutCustomerDetails;
  description?: string;
  notes?: Record<string, string>;
  onSuccess: (response: RazorpayPaymentSuccessResponse) => void | Promise<void>;
  onDismiss?: () => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export const RazorpayService = {
  /**
   * Dynamically loads Razorpay checkout script if not already present
   */
  loadScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error('Failed to load Razorpay SDK');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  },

  /**
   * Calls the backend to create a Razorpay order
   */
  async createOrder(
    amountInRupees: number,
    receiptId?: string,
    notes?: Record<string, string>
  ): Promise<RazorpayOrderResponse> {
    const amountInPaise = Math.round(amountInRupees * 100);

    if (amountInPaise < 100) {
      throw new Error('Order amount must be at least ₹1.00 (100 paise).');
    }

    const response = await fetch('/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId || `gt_rcpt_${Date.now()}`,
        notes: notes || {},
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create payment order on server.');
    }

    return data;
  },

  /**
   * Calls the backend to verify the Razorpay payment signature
   */
  async verifyPayment(paymentDetails: RazorpayPaymentSuccessResponse): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentDetails),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Payment signature verification failed.');
    }

    return data;
  },

  /**
   * Full workflow: creates order, opens Razorpay standard modal, handles success/dismiss/error, and verifies signature.
   */
  async initiateCheckout({
    amountInRupees,
    receiptId,
    customer,
    description = 'Girly Tales Order Checkout',
    notes = {},
    onSuccess,
    onDismiss,
    onError,
  }: InitiatePaymentParams): Promise<void> {
    try {
      const isLoaded = await this.loadScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // 1. Create order on backend
      const order = await this.createOrder(amountInRupees, receiptId, notes);
      const razorpayKey =
        import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TbD8G3ANJoWXsX';

      // 2. Configure Razorpay Standard Modal options
      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Girly Tales',
        description: description,
        image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=120&q=80',
        order_id: order.order_id || order.id,
        prefill: {
          name: customer.name || '',
          email: customer.email || '',
          contact: customer.phone ? customer.phone.replace(/\D/g, '').slice(-10) : '',
        },
        theme: {
          color: '#967BB6', // Girly Tales luxury brand lavender
        },
        modal: {
          ondismiss: () => {
            console.log('Razorpay modal closed by customer.');
            if (onDismiss) onDismiss();
          },
        },
        handler: async (response: RazorpayPaymentSuccessResponse) => {
          try {
            // 3. Verify payment signature on backend
            await this.verifyPayment(response);
            await onSuccess(response);
          } catch (err: any) {
            console.error('Payment verification failed:', err);
            if (onError) onError(err?.message || 'Payment verification failed.');
          }
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        const errMsg = response.error?.description || 'Payment was unsuccessful or declined by your bank.';
        if (onError) onError(errMsg);
      });

      rzp.open();
    } catch (err: any) {
      console.error('Initiate checkout error:', err);
      if (onError) onError(err?.message || 'Failed to start payment checkout.');
    }
  },
};
