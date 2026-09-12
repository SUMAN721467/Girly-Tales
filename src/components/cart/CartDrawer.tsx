import React, { useState } from 'react';
import { X, ShoppingBag, Truck, Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

interface CartDrawerProps {
  onNavigateToShop: () => void;
  onNavigateToCartPage: () => void;
  onOpenCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onNavigateToShop,
  onNavigateToCartPage,
  onOpenCheckout,
}) => {
  const {
    items,
    isCartOpen,
    closeCart,
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
    updateQuantity,
    removeFromCart,
    isCartSyncing,
  } = useCart();
  const { user, isLoggedIn, openAuthModal } = useAuth();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  if (!isCartOpen) return null;

  const handleProceedToCheckout = () => {
    if (!isLoggedIn || !user) {
      closeCart();
      openAuthModal('login');
      return;
    }
    closeCart();
    onOpenCheckout();
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput) return;
    const res = applyCoupon(couponInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponInput('');
    }
  };

  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div className="fixed inset-0 z-50 flex justify-end modal-backdrop animate-fade-in" onClick={closeCart}>
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-slide-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#EAE6DB] bg-[#fffeea]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-lavender" />
              <h3 className="font-sans font-black text-base uppercase text-brand-charcoal">
                Your Bag ({totalItems})
              </h3>
              {isCartSyncing && (
                <span className="text-[10px] text-[#967BB6] animate-pulse flex items-center gap-1 font-bold bg-white/80 px-2 py-0.5 rounded-full border border-[#967BB6]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#967BB6] animate-ping" />
                  Syncing
                </span>
              )}
            </div>
            <button
              onClick={closeCart}
              className="w-8 h-8 rounded-full bg-white text-brand-charcoal flex items-center justify-center border border-[#EAE6DB]"
              aria-label="Close cart"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Free Shipping Progress */}
          <div className="mt-3 bg-white p-2.5 border border-[#EAE6DB]">
            <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
              <span className="flex items-center gap-1 text-brand-charcoal">
                <Truck className="w-3.5 h-3.5 text-brand-lavender" />
                {remainingForFreeShipping === 0 ? (
                  <span className="text-emerald-700">🎉 FREE Pan-India Delivery Unlocked!</span>
                ) : (
                  <span>
                    Add <strong className="text-brand-lavender">₹{remainingForFreeShipping}</strong> for FREE Delivery
                  </span>
                )}
              </span>
              <span className="text-[10px] text-brand-muted">{freeShippingProgress}%</span>
            </div>
            <div className="w-full bg-[#fffeea] h-2 overflow-hidden border border-[#EAE6DB]">
              <div
                className="bg-[#967BB6] h-full transition-all duration-300"
                style={{ width: `${freeShippingProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 divide-y divide-[#EAE6DB]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#fffeea] text-brand-lavender flex items-center justify-center">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-sans font-bold text-base text-brand-charcoal uppercase">
                Your bag is empty
              </h4>
              <p className="text-xs text-brand-muted max-w-xs">
                Check out our bestselling cotton sets and 18K anti-tarnish jewellery!
              </p>
              <button
                onClick={() => {
                  closeCart();
                  onNavigateToShop();
                }}
                className="mt-2 px-6 py-2.5 bg-[#967BB6] text-white text-xs font-bold uppercase tracking-wider rounded"
              >
                Shop Now
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3 pt-3">
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-16 h-20 object-cover rounded-lg border border-[#EAE6DB] shrink-0"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h5 className="font-bold text-xs text-brand-charcoal truncate">
                        {item.product.name}
                      </h5>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-brand-muted hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {item.selectedSize && (
                      <span className="text-[10px] text-brand-muted block">
                        Size: {item.selectedSize}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center border border-[#EAE6DB] bg-[#fffeea] px-2 py-0.5 text-xs font-bold">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-1"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="px-2">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-1"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-brand-charcoal">
                      Rs. {(item.product.price * item.quantity).toLocaleString('en-IN')}.00
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-[#EAE6DB] bg-white space-y-3">
            {/* Coupon */}
            <div>
              {appliedCoupon ? (
                <div className="flex justify-between items-center bg-[#FCE7ED] p-2 text-xs font-bold text-brand-charcoal">
                  <span>Coupon {appliedCoupon} applied!</span>
                  <button onClick={removeCoupon} className="text-rose-600 underline text-[11px]">
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon (e.g. GIRLY10)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-1 border border-[#EAE6DB] bg-[#fffeea] px-3 py-2 text-xs uppercase font-bold focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#967BB6] hover:bg-[#7F62A1] active:bg-[#6D528F] text-white text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              )}
              {couponError && <p className="text-[11px] text-rose-500 mt-1">{couponError}</p>}
            </div>

            {/* Calculations */}
            <div className="space-y-1.5 text-xs text-brand-muted">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-brand-charcoal">Rs. {subtotal}.00</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount</span>
                  <span>- Rs. {discountAmount}.00</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shippingFee === 0 ? <strong className="text-emerald-600">FREE</strong> : `Rs. ${shippingFee}.00`}</span>
              </div>
              <div className="flex justify-between text-base font-black text-brand-charcoal pt-2 border-t border-[#EAE6DB]">
                <span>Total</span>
                <span>Rs. {finalTotal}.00</span>
              </div>
            </div>

            {/* Checkout Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleProceedToCheckout}
                className="w-full py-3.5 bg-[#967BB6] hover:bg-brand-lavender-dark text-white font-black text-xs uppercase tracking-widest transition-colors shadow-md cursor-pointer"
              >
                Proceed to Checkout • Rs. {finalTotal}.00
              </button>
              <button
                onClick={() => {
                  closeCart();
                  onNavigateToCartPage();
                }}
                className="w-full py-2.5 bg-transparent border border-brand-charcoal text-brand-charcoal hover:bg-black/5 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                View Full Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
