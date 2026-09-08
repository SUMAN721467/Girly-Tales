import React from 'react';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { Product } from '../types/product';
import { Button } from '../components/common/Button';
import { RatingStars } from '../components/common/RatingStars';

interface WishlistPageProps {
  onNavigateToShop: () => void;
  onSelectProduct: (product: Product) => void;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({
  onNavigateToShop,
  onSelectProduct,
}) => {
  const { wishlistProducts, toggleWishlist, clearWishlist, wishlistCount } = useWishlist();
  const { addToCart, openCart } = useCart();

  const handleMoveToCart = (product: Product) => {
    addToCart(product, 1);
    toggleWishlist(product.id);
    openCart();
  };

  if (wishlistCount === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-24 h-24 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
          <Heart className="w-12 h-12 fill-rose-500/20" />
        </div>
        <h2 className="font-serif text-3xl font-medium text-brand-charcoal">
          Your Wishlist is Empty
        </h2>
        <p className="text-sm text-brand-muted max-w-sm mx-auto">
          Save your dream silk sets, waterproof rings, and necklaces so you never lose track of them.
        </p>
        <div className="pt-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onNavigateToShop}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Discover Styles
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
          <span className="font-script text-2xl text-rose-500 font-semibold">Saved Styles</span>
          <h1 className="font-serif text-3xl sm:text-4xl text-brand-charcoal font-medium">
            My Wishlist ({wishlistCount})
          </h1>
        </div>
        <button
          onClick={clearWishlist}
          className="text-xs text-brand-muted hover:text-rose-500 font-semibold transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Wishlist</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {wishlistProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-xs hover:shadow-card transition-all flex flex-col justify-between group"
          >
            {/* Image */}
            <div
              onClick={() => onSelectProduct(product)}
              className="relative aspect-[4/5] overflow-hidden bg-brand-ivory cursor-pointer"
            >
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(product.id);
                }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white text-rose-500 flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                title="Remove from wishlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] uppercase font-bold text-brand-lilac">
                    {product.subCategory}
                  </span>
                  <RatingStars rating={product.rating} size="sm" showCountText={false} />
                </div>
                <h3
                  onClick={() => onSelectProduct(product)}
                  className="font-serif text-sm font-medium text-brand-charcoal line-clamp-2 cursor-pointer hover:text-brand-lilac transition-colors"
                >
                  {product.name}
                </h3>
              </div>

              <div className="space-y-3 pt-2 border-t border-brand-border/60">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-sm text-brand-charcoal">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  {product.originalPrice > product.price && (
                    <span className="text-xs text-brand-muted-light line-through">
                      ₹{product.originalPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => handleMoveToCart(product)}
                  leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
                >
                  Move to Bag
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
