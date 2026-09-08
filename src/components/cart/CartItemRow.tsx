import React from 'react';
import { Trash2, Plus, Minus, Sparkles } from 'lucide-react';
import { CartItem } from '../../types/product';
import { useCart } from '../../context/CartContext';

interface CartItemRowProps {
  item: CartItem;
  compact?: boolean;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item, compact = false }) => {
  const { updateQuantity, removeFromCart } = useCart();
  const { product, quantity, selectedSize, selectedColor } = item;

  return (
    <div className={`flex gap-3 ${compact ? 'py-2' : 'py-3'} border-b border-brand-border/60 group animate-fade-in`}>
      {/* Thumbnail */}
      <div className={`${compact ? 'w-12 h-14' : 'w-16 h-20 sm:w-20 sm:h-24'} rounded-2xl overflow-hidden bg-brand-ivory border border-brand-border shrink-0`}>
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-serif text-xs sm:text-sm font-medium text-brand-charcoal line-clamp-1">
              {product.name}
            </h4>
            <button
              onClick={() => removeFromCart(item.id)}
              className="text-brand-muted-light hover:text-rose-500 p-1 transition-colors"
              aria-label="Remove item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Variants */}
          <div className="flex items-center gap-2 text-[11px] text-brand-muted mt-0.5">
            {selectedSize && (
              <span className="bg-brand-ivory px-1.5 py-0.5 rounded border border-brand-border font-medium">
                Size: {selectedSize}
              </span>
            )}
            {selectedColor && (
              <span className="text-brand-muted font-medium">{selectedColor}</span>
            )}
            {product.category === 'jewellery' && (
              <span className="text-amber-700 flex items-center gap-0.5 text-[10px]">
                <Sparkles className="w-2.5 h-2.5" /> Anti-Tarnish
              </span>
            )}
          </div>
        </div>

        {/* Price & Quantity Controls */}
        <div className="flex items-center justify-between gap-2 mt-2">
          {/* Stepper */}
          <div className="flex items-center border border-brand-border rounded-full bg-brand-ivory/80 px-1.5 py-0.5">
            <button
              onClick={() => updateQuantity(item.id, quantity - 1)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-brand-charcoal hover:bg-white text-xs font-bold transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <span className="px-2 text-xs font-bold text-brand-charcoal">{quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, quantity + 1)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-brand-charcoal hover:bg-white text-xs font-bold transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Price */}
          <div className="text-right">
            <span className="text-xs sm:text-sm font-bold text-brand-charcoal">
              ₹{(product.price * quantity).toLocaleString('en-IN')}
            </span>
            {product.originalPrice > product.price && (
              <span className="block text-[10px] text-brand-muted-light line-through">
                ₹{(product.originalPrice * quantity).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
