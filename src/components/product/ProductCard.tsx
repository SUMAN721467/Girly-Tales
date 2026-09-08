import React, { useState } from 'react';
import { Heart, ShoppingBag, Sparkles, Check } from 'lucide-react';
import { Product } from '../../types/product';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onQuickView?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isFavorited = isInWishlist(product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const currentImage = isHovered && product.images.length > 1
    ? product.images[1]
    : product.images[0];

  return (
    <div
      onClick={() => onSelectProduct(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col justify-between cursor-pointer relative select-none"
    >
      {/* Tall Portrait Image Container */}
      <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full overflow-hidden bg-white rounded-none border border-[#EAE6DB] mb-3">
        <img
          src={currentImage}
          alt={product.name}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Top-Left Badges (New Arrival / Back in Stock / Discount) */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {product.isNewArrival && (
            <span className="bg-[#967BB6] text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wide shadow-xs uppercase">
              New Arrival
            </span>
          )}
          {product.isBestSeller && !product.isNewArrival && (
            <span className="bg-[#E56B88] text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wide shadow-xs uppercase">
              Back in Stock
            </span>
          )}
        </div>

        {/* Wishlist Button Top-Right */}
        <button
          onClick={handleWishlistClick}
          className={`absolute top-2.5 right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 ${
            isFavorited
              ? 'bg-white text-rose-500 shadow-md'
              : 'bg-white/80 hover:bg-white text-brand-charcoal hover:text-rose-500 shadow-xs'
          }`}
          aria-label="Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Bottom-Left Feature Badge (e.g. 100% Cotton / 18K Gold Plated) */}
        <div className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold text-brand-charcoal flex items-center gap-1 border border-gray-100 shadow-xs">
          {product.category === 'jewellery' ? (
            <>
              <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
              <span>18K Gold Plated</span>
            </>
          ) : (
            <>
              <span>100% Cotton 🌿</span>
            </>
          )}
        </div>

        {/* Quick Add overlay button on hover */}
        <div className="absolute inset-x-2 bottom-2 hidden sm:flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleQuickAdd}
            className={`w-full py-2 rounded text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
              isAdded ? 'bg-emerald-600 text-white' : 'bg-[#1A1821] hover:bg-[#967BB6] text-white'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added to Bag</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Quick Add</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Product Info Section below image */}
      <div className="space-y-1 text-left">
        <h3 className="font-sans text-xs sm:text-sm font-semibold text-brand-charcoal line-clamp-1 group-hover:text-brand-lavender transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-xs sm:text-sm text-brand-charcoal">
            Rs. {product.price.toLocaleString('en-IN')}.00
          </span>
          {product.originalPrice > product.price && (
            <span className="text-[11px] text-brand-muted-light line-through">
              Rs. {product.originalPrice.toLocaleString('en-IN')}.00
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
