import React from 'react';
import { CheckCircle, Heart, ShoppingBag, X, AlertCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast, openCart } = useCart();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 md:px-0">
      {toasts.map((toast) => {
        const isCart = toast.type === 'cart';
        const isWishlist = toast.type === 'wishlist';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-card border border-brand-lilac/20 animate-slide-up transition-all hover:shadow-lg"
          >
            {/* Image or Icon */}
            {toast.product ? (
              <img
                src={toast.product.images[0]}
                alt={toast.product.name}
                className="w-12 h-12 rounded-xl object-cover border border-brand-border shrink-0"
              />
            ) : (
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isError
                    ? 'bg-rose-50 text-rose-600'
                    : isWishlist
                    ? 'bg-rose-50 text-rose-500'
                    : isCart
                    ? 'bg-brand-lilac-subtle text-brand-lilac'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {isError ? (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                ) : isWishlist ? (
                  <Heart className="w-5 h-5 fill-rose-500" />
                ) : isCart ? (
                  <ShoppingBag className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </div>
            )}

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-brand-charcoal flex items-center gap-1.5 truncate">
                {toast.message}
              </p>
              {toast.submessage && (
                <p className="text-[11px] text-brand-muted truncate mt-0.5">
                  {toast.submessage}
                </p>
              )}
            </div>

            {/* View Cart Quick Action if cart toast */}
            {isCart && (
              <button
                onClick={() => {
                  dismissToast(toast.id);
                  openCart();
                }}
                className="text-[11px] font-semibold text-brand-lilac hover:text-brand-lilac-dark underline px-1 shrink-0"
              >
                View
              </button>
            )}

            {/* Dismiss Button */}
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-brand-muted-light hover:text-brand-charcoal p-1 rounded-full transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
