import React, { useState } from 'react';
import { ShoppingBag, ArrowRight, Truck, Tag, ArrowLeft, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CartItemRow } from '../components/cart/CartItemRow';
import { Button } from '../components/common/Button';
import { Product } from '../types/product';

interface CartPageProps {
  onNavigateToShop: () => void;
  onOpenCheckout: () => void;
  onSelectProduct: (product: Product) => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  onNavigateToShop,
  onOpenCheckout,
}) => {
  const {
    items,
    totalItems,
    subtotal,
    discountAmount,
    shippingFee,
    finalTotal,
    freeShippingThreshold,
    freeShippingProgress,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    clearCart,
    isCartSyncing,
  } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');

  const remaining = Math.max(0, freeShippingThreshold - subtotal);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponCode) return;
    const res = applyCoupon(couponCode);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponCode('');
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-24 h-24 rounded-full bg-brand-lilac-subtle text-brand-lilac flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag className="w-12 h-12" />
        </div>
        <h2 className="font-serif text-3xl font-medium text-brand-charcoal">
          Your Shopping Bag is Empty
        </h2>
        <p className="text-sm text-brand-muted max-w-sm mx-auto">
          Explore our signature collections of pure mulberry silk nightwear and waterproof anti-tarnish jewellery.
        </p>
        <div className="pt-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onNavigateToShop}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Start Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-brand-border">
        <div>
          <span className="font-script text-2xl text-brand-lilac font-semibold">Your Selection</span>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl sm:text-4xl text-brand-charcoal font-medium">
              Shopping Cart ({totalItems} items)
            </h1>
            {isCartSyncing && (
              <span className="text-[10px] text-[#967BB6] animate-pulse flex items-center gap-1 font-bold bg-[#FAF8F2] px-2.5 py-1 rounded-full border border-[#967BB6]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#967BB6] animate-ping" />
                Syncing
              </span>
            )}
          </div>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-rose-500 font-bold hover:underline flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Bag</span>
        </button>
      </div>

      {/* Free Shipping Progress */}
      <div className="p-4 bg-brand-lilac-subtle/40 rounded-3xl border border-brand-border/80">
        <div className="flex items-center justify-between text-xs font-semibold text-brand-charcoal mb-2">
          <span className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-brand-lilac" />
            {remaining === 0 ? (
              <span className="text-emerald-700 font-bold">🎉 You have unlocked Free Pan-India Delivery!</span>
            ) : (
              <span>
                Add <strong className="text-brand-lilac">₹{remaining}</strong> more for <strong>FREE Pan-India Shipping</strong>
              </span>
            )}
          </span>
          <span className="text-brand-muted text-[11px]">{freeShippingProgress}%</span>
        </div>
        <div className="w-full bg-white rounded-full h-2.5 overflow-hidden border border-brand-border">
          <div
            className="bg-brand-lilac h-full transition-all duration-500 rounded-full"
            style={{ width: `${freeShippingProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Cart Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Item Rows */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-brand-border shadow-xs divide-y divide-brand-border">
          {items.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))}

          <div className="pt-4">
            <button
              onClick={onNavigateToShop}
              className="inline-flex items-center gap-2 text-xs font-semibold text-brand-lilac hover:text-brand-lilac-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Continue Shopping</span>
            </button>
          </div>
        </div>

        {/* Order Summary Box */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-brand-border shadow-xs space-y-5 sticky top-24">
          <h3 className="font-serif text-xl font-bold text-brand-charcoal pb-3 border-b border-brand-border">
            Order Summary
          </h3>

          {/* Coupon */}
          <div>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-800">
                <div className="flex items-center gap-1.5 font-bold">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span>Coupon {appliedCoupon} Applied!</span>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-rose-600 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                <label className="block text-xs font-semibold text-brand-charcoal">
                  Promo Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="GIRLY10"
                    className="flex-1 bg-brand-ivory border border-brand-border rounded-xl px-3 py-2 text-xs uppercase focus:outline-none focus:border-brand-lilac"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#967BB6] hover:bg-[#7F62A1] active:bg-[#6D528F] text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-[11px] text-rose-500">{couponError}</p>}
              </form>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2.5 text-xs text-brand-muted pt-2 border-t border-brand-border">
            <div className="flex justify-between">
              <span>Subtotal ({totalItems} items)</span>
              <span className="font-semibold text-brand-charcoal">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Coupon Discount</span>
                <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Estimated Delivery</span>
              <span>{shippingFee === 0 ? <strong className="text-emerald-600 font-bold">FREE</strong> : `₹${shippingFee}`}</span>
            </div>

            <div className="flex justify-between text-base font-bold text-brand-charcoal pt-3 border-t border-brand-border">
              <span>Grand Total</span>
              <span className="text-lg text-brand-lilac font-black">₹{finalTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            onClick={onOpenCheckout}
            className="w-full py-4 px-6 bg-[#967BB6] hover:bg-[#7F62A1] active:bg-[#6D528F] text-white font-bold text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-[#967BB6]/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 select-none"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
