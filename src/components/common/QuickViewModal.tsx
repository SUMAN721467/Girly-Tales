import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, Heart } from 'lucide-react';
import { Product } from '../../types/product';
import { RatingStars } from './RatingStars';
import { Button } from './Button';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onViewFullDetails: (product: Product) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  onClose,
  onViewFullDetails,
}) => {
  if (!product) return null;

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes ? product.sizes[0] : undefined
  );
  const [quantity, setQuantity] = useState(1);

  const { items, addToCart, openCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user, isLoggedIn, openAuthModal } = useAuth();

  const isFavorited = isInWishlist(product.id);
  const isProductInCart = items.some((item) => item.product.id === product.id);

  const handleAddToCart = () => {
    if (isProductInCart) {
      onClose();
      openCart();
      return;
    }
    if (!isLoggedIn || !user) {
      onClose();
      openAuthModal('login');
      return;
    }
    addToCart(product, quantity, selectedSize);
    onClose();
    openCart();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-brand-ivory hover:bg-brand-lilac-subtle flex items-center justify-center text-brand-charcoal transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Gallery side */}
          <div>
            <div className="aspect-[4/5] max-w-[280px] sm:max-w-[320px] mx-auto rounded-xl overflow-hidden bg-brand-ivory border border-brand-border mb-3">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-14 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx
                        ? 'border-brand-lilac'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details side */}
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-brand-lilac uppercase tracking-wider">
                {product.subCategory}
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-medium text-brand-charcoal mt-1">
                {product.name}
              </h2>
              <div className="mt-2">
                <RatingStars rating={product.rating} reviewCount={product.reviewCount} size="sm" />
              </div>
            </div>

            {/* Price section */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-brand-charcoal">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.originalPrice > product.price && (
                <>
                  <span className="text-sm text-brand-muted-light line-through">
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                    {product.discount}% OFF
                  </span>
                </>
              )}
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              {product.shortDescription || product.description}
            </p>

            {/* Size Selector for Nightwear */}
            {product.sizes && (
              <div>
                <span className="text-xs font-bold text-brand-charcoal block mb-2">
                  Select Size: <strong className="text-brand-lilac">{selectedSize}</strong>
                </span>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        selectedSize === size
                          ? 'border-brand-lilac bg-brand-lilac text-white shadow-sm'
                          : 'border-brand-border bg-brand-ivory text-brand-charcoal hover:border-brand-muted'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-brand-charcoal">Quantity:</span>
              <div className="flex items-center border border-brand-border rounded-full bg-brand-ivory px-2 py-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-brand-charcoal hover:bg-white text-sm font-bold"
                >
                  -
                </button>
                <span className="px-3 text-xs font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-brand-charcoal hover:bg-white text-sm font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-2.5 pt-2">
              <Button
                variant="primary"
                fullWidth
                onClick={handleAddToCart}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                {isProductInCart ? 'Go to Cart' : 'Add to Cart'}
              </Button>
              <button
                onClick={() => toggleWishlist(product.id)}
                className={`p-3 rounded-full border transition-colors ${
                  isFavorited
                    ? 'border-rose-300 bg-rose-50 text-rose-500'
                    : 'border-brand-border hover:bg-brand-ivory text-brand-charcoal'
                }`}
                aria-label="Wishlist"
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-rose-500' : ''}`} />
              </button>
            </div>

            {/* View Full Product link */}
            <button
              onClick={() => {
                onClose();
                onViewFullDetails(product);
              }}
              className="w-full text-center text-xs text-brand-lilac hover:text-brand-lilac-dark font-bold hover:underline flex items-center justify-center gap-1 pt-1"
            >
              <span>View complete specifications & reviews</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
