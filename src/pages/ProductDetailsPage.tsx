import React, { useState } from 'react';
import { Heart, Sparkles, Truck, RefreshCw, ChevronDown, ChevronUp, Ruler, ArrowLeft } from 'lucide-react';
import { Product } from '../types/product';
import { MOCK_PRODUCTS } from '../data/products';
import { ProductCard } from '../components/product/ProductCard';
import { SizeGuideModal } from '../components/common/SizeGuideModal';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

interface ProductDetailsPageProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onBackToShop: () => void;
  onOpenCheckout: () => void;
}

export const ProductDetailsPage: React.FC<ProductDetailsPageProps> = ({
  product,
  onSelectProduct,
  onBackToShop,
  onOpenCheckout,
}) => {
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes ? product.sizes[0] : undefined
  );
  const [quantity, setQuantity] = useState(1);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    description: true,
    care: false,
    shipping: false,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { addToCart, openCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isFavorited = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedSize);
    openCart();
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedSize);
    onOpenCheckout();
  };

  const relatedProducts = MOCK_PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category
  ).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-8 sm:space-y-12 bg-[#FFFDD0] w-full">
      {/* Back button */}
      <div>
        <button
          onClick={onBackToShop}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-muted hover:text-brand-lavender uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Collection</span>
        </button>
      </div>

      {/* Main Product Layout: Stacks on mobile, 2-col on lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
        {/* Left: Product Images (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="aspect-[3/4] sm:aspect-[4/5] bg-white border border-[#EAE6DB] overflow-hidden relative w-full">
            <img
              src={product.images[activeImage]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.isNewArrival && (
              <span className="absolute top-3 left-3 bg-[#967BB6] text-white text-[9px] sm:text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider">
                New Arrival
              </span>
            )}
          </div>

          {/* Thumbnail Strip */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-14 sm:w-20 aspect-[3/4] border-2 overflow-hidden shrink-0 ${
                    activeImage === idx ? 'border-[#967BB6]' : 'border-transparent opacity-70'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details & Actions (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-7 border border-[#EAE6DB] space-y-5">
          <div className="space-y-1.5 border-b border-[#EAE6DB] pb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#967BB6]">
              {product.subCategory}
            </span>
            <h1 className="font-sans font-black text-xl sm:text-2xl md:text-3xl text-brand-charcoal uppercase leading-tight">
              {product.name}
            </h1>

            {/* Price Box */}
            <div className="flex items-baseline gap-2.5 pt-1">
              <span className="text-xl sm:text-2xl font-black text-brand-charcoal">
                Rs. {product.price.toLocaleString('en-IN')}.00
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs sm:text-sm text-brand-muted-light line-through">
                  Rs. {product.originalPrice.toLocaleString('en-IN')}.00
                </span>
              )}
            </div>
            <p className="text-[11px] text-brand-muted">
              Tax included. Free shipping on prepaid orders.
            </p>
          </div>

          {/* Sizes */}
          {product.sizes && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                  Size: <strong className="text-brand-lavender">{selectedSize}</strong>
                </span>
                <button
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-xs text-brand-lavender font-bold underline flex items-center gap-1"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Size Chart</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-11 sm:w-12 h-10 text-xs font-bold border transition-all ${
                      selectedSize === size
                        ? 'bg-[#967BB6] text-white border-[#967BB6]'
                        : 'bg-white text-brand-charcoal border-[#EAE6DB] hover:border-brand-lavender'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & CTAs */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Stepper */}
              <div className="flex items-center border border-[#EAE6DB] bg-[#FFFDD0] px-2.5 py-2 text-xs font-bold shrink-0">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-1.5"
                >
                  -
                </button>
                <span className="px-2">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-1.5"
                >
                  +
                </button>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3 bg-[#967BB6] hover:bg-brand-lavender-dark text-white font-black text-xs uppercase tracking-wider transition-colors shadow-xs"
              >
                Add to Cart
              </button>

              {/* Wishlist */}
              <button
                onClick={() => toggleWishlist(product.id)}
                className={`p-3 border transition-colors shrink-0 ${
                  isFavorited
                    ? 'border-rose-300 bg-rose-50 text-rose-500'
                    : 'border-[#EAE6DB] text-brand-charcoal hover:bg-[#FFFDD0]'
                }`}
                aria-label="Wishlist"
              >
                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFavorited ? 'fill-rose-500' : ''}`} />
              </button>
            </div>

            {/* Buy Now Button (Pink) */}
            <button
              onClick={handleBuyNow}
              className="w-full py-3 bg-[#FBB6CE] hover:bg-[#F89CBA] text-[#1A1821] font-black text-xs uppercase tracking-wider transition-colors shadow-xs"
            >
              Buy It Now (Express Checkout)
            </button>
          </div>

          {/* USPs Bullets */}
          <div className="p-3.5 bg-[#FFFDD0] border border-[#EAE6DB] space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-brand-charcoal">
              <Truck className="w-3.5 h-3.5 text-brand-lavender shrink-0" />
              <span>Free Delivery on all prepaid orders</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-brand-charcoal">
              <RefreshCw className="w-3.5 h-3.5 text-brand-lavender shrink-0" />
              <span>7-Day Hassle-Free Size Exchange</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-brand-charcoal">
              <Sparkles className="w-3.5 h-3.5 text-brand-lavender shrink-0" />
              <span>100% Anti-Tarnish &amp; Waterproof</span>
            </div>
          </div>

          {/* Expandable Accordions */}
          <div className="border-t border-[#EAE6DB] divide-y divide-[#EAE6DB]">
            <div>
              <button
                onClick={() => toggleAccordion('description')}
                className="w-full py-3 flex items-center justify-between text-xs font-black uppercase tracking-wider text-brand-charcoal text-left"
              >
                <span>Description &amp; Fabric</span>
                {openAccordions.description ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {openAccordions.description && (
                <div className="pb-3 text-xs text-brand-muted leading-relaxed space-y-1.5">
                  <p>{product.description}</p>
                  <p><strong>Material:</strong> {product.material}</p>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => toggleAccordion('care')}
                className="w-full py-3 flex items-center justify-between text-xs font-black uppercase tracking-wider text-brand-charcoal text-left"
              >
                <span>Care Instructions</span>
                {openAccordions.care ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {openAccordions.care && (
                <div className="pb-3 text-xs text-brand-muted space-y-1">
                  {product.careInstructions.map((c, i) => (
                    <p key={i}>• {c}</p>
                  ))}
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => toggleAccordion('shipping')}
                className="w-full py-3 flex items-center justify-between text-xs font-black uppercase tracking-wider text-brand-charcoal text-left"
              >
                <span>Delivery &amp; Exchange Policy</span>
                {openAccordions.shipping ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {openAccordions.shipping && (
                <div className="pb-3 text-xs text-brand-muted leading-relaxed">
                  Dispatched within 24 hours. Delivered across India within 2 to 4 business days. Easy 7-day exchange support available on WhatsApp.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Grid: 2 col mobile, 4 col desktop */}
      {relatedProducts.length > 0 && (
        <section className="pt-6 border-t border-[#EAE6DB] space-y-4 sm:space-y-6">
          <h3 className="font-sans font-black text-xl sm:text-2xl text-brand-charcoal uppercase tracking-tight">
            You May Also Like
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.id}
                product={rel}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        </section>
      )}

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        category={product.category}
      />
    </div>
  );
};
