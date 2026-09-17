import React from 'react';
import { CheckCircle, Heart, ShoppingBag, X, AlertCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast, openCart } = useCart();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-3 right-3 sm:top-5 sm:right-5 z-[9999] flex flex-col gap-2 max-w-[calc(100vw-1.5rem)] sm:max-w-xs w-full pointer-events-none">
      {toasts.map((toast) => {
        const isCart = toast.type === 'cart';
        const isWishlist = toast.type === 'wishlist';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-2.5 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-xl shadow-lg border border-[#EAE6DB] animate-toast-in transition-all hover:shadow-xl"
          >
            {/* Image or Icon */}
            {toast.product ? (
              <img
                src={toast.product.images[0]}
                alt={toast.product.name}
                className="w-10 h-10 rounded-lg object-cover border border-brand-border shrink-0"
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
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
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                ) : isWishlist ? (
                  <Heart className="w-4 h-4 fill-rose-500" />
                ) : isCart ? (
                  <ShoppingBag className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
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
