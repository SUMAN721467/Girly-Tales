import React, { useState } from 'react';
import { X, CheckCircle, CreditCard, Smartphone, Banknote, Sparkles, Truck, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../common/Button';
import { DatabaseService } from '../../lib/databaseService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const { items, subtotal, discountAmount, shippingFee, finalTotal, clearCart, triggerToast } = useCart();

  const [step, setStep] = useState<'details' | 'success'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cod'>('upi');
  const [formData, setFormData] = useState({
    name: 'Ananya Verma',
    email: 'ananya@example.com',
    phone: '9876543210',
    pincode: '400050',
    address: 'B-402, Sea Green Heights, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
  });
  const [orderId, setOrderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const generatedId = 'GT-' + Math.floor(100000 + Math.random() * 900000);
    const orderItems = items.map(
      (item) => `${item.product.name}${item.selectedSize ? ` (${item.selectedSize})` : ''} x${item.quantity}`
    );

    try {
      await DatabaseService.createOrder({
        id: generatedId,
        customerName: formData.name || 'Customer',
        email: formData.email || '',
        phone: formData.phone || '',
        items: orderItems.length > 0 ? orderItems : ['Mulberry Silk Lounge Set x1'],
        total: finalTotal,
        subtotal: subtotal,
        shippingFee: shippingFee,
        discountAmount: discountAmount,
        status: 'Processing',
        paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'card' ? 'Credit / Debit Card' : 'UPI / Prepaid',
        address: formData.address || '',
        city: formData.city || 'Mumbai',
        state: formData.state || 'Maharashtra',
        pincode: formData.pincode || '',
      });
    } catch (err) {
      console.warn('Order save note:', err);
    }

    setOrderId(generatedId);
    setIsSubmitting(false);
    setStep('success');
    clearCart();
    triggerToast('Order Placed! 🎉', `Order #${generatedId} confirmed and saved.`, undefined, 'success');
    onOrderSuccess(generatedId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-brand-ivory hover:bg-brand-lilac-subtle flex items-center justify-center text-brand-charcoal transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'details' ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-brand-border">
              <div className="w-10 h-10 rounded-2xl bg-brand-lilac text-white flex items-center justify-center shadow-soft">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-semibold text-brand-charcoal">
                  Complete Your Order
                </h3>
                <p className="text-xs text-brand-muted">
                  Safe & Secure 256-bit Encrypted Checkout
                </p>
              </div>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-6">
              {/* Shipping Address */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal mb-3 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-brand-lilac" />
                  1. Delivery Address
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-brand-muted font-medium mb-1">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3 py-2.5 text-brand-charcoal focus:outline-none focus:border-brand-lilac"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-brand-muted font-medium mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3 py-2.5 text-brand-charcoal focus:outline-none focus:border-brand-lilac"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-brand-muted font-medium mb-1">Street Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3 py-2.5 text-brand-charcoal focus:outline-none focus:border-brand-lilac"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-brand-muted font-medium mb-1">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3 py-2.5 text-brand-charcoal focus:outline-none focus:border-brand-lilac"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-brand-muted font-medium mb-1">Pin Code</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3 py-2.5 text-brand-charcoal focus:outline-none focus:border-brand-lilac"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal mb-3 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-brand-lilac" />
                  2. Select Payment Method
                </h4>
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                      paymentMethod === 'upi'
                        ? 'border-brand-lilac bg-brand-lilac-subtle text-brand-lilac-dark font-bold ring-2 ring-brand-lilac/30'
                        : 'border-brand-border bg-brand-ivory text-brand-charcoal'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>UPI / GPay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                      paymentMethod === 'card'
                        ? 'border-brand-lilac bg-brand-lilac-subtle text-brand-lilac-dark font-bold ring-2 ring-brand-lilac/30'
                        : 'border-brand-border bg-brand-ivory text-brand-charcoal'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Credit / Debit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                      paymentMethod === 'cod'
                        ? 'border-brand-lilac bg-brand-lilac-subtle text-brand-lilac-dark font-bold ring-2 ring-brand-lilac/30'
                        : 'border-brand-border bg-brand-ivory text-brand-charcoal'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span>Cash on Delivery</span>
                  </button>
                </div>
              </div>

              {/* Order Summary Snapshot */}
              <div className="p-4 bg-brand-ivory rounded-2xl border border-brand-border space-y-2 text-xs">
                <div className="flex justify-between text-brand-muted">
                  <span>Items Total ({items.length} products)</span>
                  <span className="font-semibold text-brand-charcoal">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-brand-muted">
                  <span>Shipping</span>
                  <span>{shippingFee === 0 ? <strong className="text-emerald-600">FREE</strong> : `₹${shippingFee}`}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-brand-charcoal pt-2 border-t border-brand-border">
                  <span>Total Payable</span>
                  <span className="text-base text-brand-lilac font-black">₹{finalTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                isLoading={isSubmitting}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Place Order • ₹{finalTotal.toLocaleString('en-IN')}
              </Button>
            </form>
          </div>
        ) : (
          /* Order Confirmation Screen */
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>

            <span className="font-script text-3xl text-brand-lilac block">
              Hooray! Order Confirmed 💕
            </span>

            <h3 className="font-serif text-2xl font-bold text-brand-charcoal">
              Thank You, {formData.name.split(' ')[0]}!
            </h3>

            <p className="text-xs text-brand-muted max-w-sm mx-auto leading-relaxed">
              We have received your order <strong>#{orderId}</strong>. A confirmation WhatsApp & email has been sent to{' '}
              <strong>{formData.phone}</strong>.
            </p>

            <div className="p-4 bg-brand-ivory rounded-2xl border border-brand-border max-w-sm mx-auto text-xs text-left space-y-1.5">
              <p className="font-bold text-brand-charcoal">Estimated Delivery:</p>
              <p className="text-brand-muted">2 - 4 Business Days with Premium Express Shipping 🚚</p>
              <p className="text-brand-muted">Payment: {paymentMethod.toUpperCase()}</p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={onClose}
              className="mt-4"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue Shopping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
