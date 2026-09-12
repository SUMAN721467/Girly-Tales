import React, { useState, useEffect, useRef } from 'react';
import { Heart, Sparkles, Truck, RefreshCw, ChevronDown, ChevronUp, Ruler, ArrowLeft, ZoomIn } from 'lucide-react';
import { Product } from '../types/product';
import { ProductCard } from '../components/product/ProductCard';
import { SizeGuideModal } from '../components/common/SizeGuideModal';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { DatabaseService } from '../lib/databaseService';

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
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes ? product.sizes[0] : undefined
  );
  const [quantity, setQuantity] = useState(1);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  useEffect(() => {
    DatabaseService.getProducts().then((prods) => {
      if (Array.isArray(prods)) {
        setProductsList(prods);
      }
    });
  }, []);

  // Amazon-style Side Zoom State
  // High-Definition Interactive Zoom State
  const [zoomState, setZoomState] = useState({
    isHovering: false,
    xPercent: 50,
    yPercent: 50,
    lensX: 0,
    lensY: 0,
  });

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (rawX / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (rawY / rect.height) * 100));

    const lensWidth = 90;
    const lensHeight = 112;
    const halfW = lensWidth / 2;
    const halfH = lensHeight / 2;

    const lensX = Math.max(0, Math.min(rect.width - lensWidth, rawX - halfW));
    const lensY = Math.max(0, Math.min(rect.height - lensHeight, rawY - halfH));

    setZoomState({
      isHovering: true,
      xPercent,
      yPercent,
      lensX,
      lensY,
    });
  };

  const handleImageTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!e.touches[0]) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const rawX = e.touches[0].clientX - rect.left;
    const rawY = e.touches[0].clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (rawX / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (rawY / rect.height) * 100));

    const lensWidth = 90;
    const lensHeight = 112;
    const halfW = lensWidth / 2;
    const halfH = lensHeight / 2;

    const lensX = Math.max(0, Math.min(rect.width - lensWidth, rawX - halfW));
    const lensY = Math.max(0, Math.min(rect.height - lensHeight, rawY - halfH));

    setZoomState({
      isHovering: true,
      xPercent,
      yPercent,
      lensX,
      lensY,
    });
  };

  const handleImageMouseLeave = () => {
    setZoomState((prev) => ({ ...prev, isHovering: false }));
  };

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

  const currentImageSrc =
    product.images?.[activeImage] ||
    product.images?.[0] ||
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80';

  const relatedProducts = productsList.filter(
    (p) => p.id !== product.id && p.category === product.category
  ).slice(0, 4);

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-6 sm:space-y-8 bg-[#fffeea] w-full">
      {/* Back button */}
      <div>
        <button
          onClick={onBackToShop}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-muted hover:text-brand-lavender uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Collection</span>
        </button>
      </div>

      {/* Unified Luxury Product Showcase Card */}
      <div className="bg-white border border-[#EAE6DB] rounded-2xl sm:rounded-3xl p-5 sm:p-7 lg:p-8 shadow-xs w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 xl:gap-12 items-start w-full">
          {/* Left: Product Media (5 cols - Compact & Elegant) */}
          <div className="lg:col-span-5 flex flex-col items-center space-y-3.5 w-full">
            {/* Main Image Frame Wrapper with Relative Anchor */}
            <div className="relative w-full max-w-[380px] lg:max-w-[420px]">
              <div
                onMouseMove={handleImageMouseMove}
                onMouseEnter={handleImageMouseMove}
                onMouseLeave={handleImageMouseLeave}
                onTouchMove={handleImageTouchMove}
                onTouchEnd={handleImageMouseLeave}
                className="relative w-full aspect-[4/5] bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl overflow-hidden shadow-2xs flex items-center justify-center cursor-crosshair select-none"
              >
                {/* Main Product Image (Unscaled & Sharp) */}
                <img
                  src={currentImageSrc}
                  alt={product.name}
                  className="w-full h-full object-cover object-center pointer-events-none"
                />

                {/* Classic Lens Box Overlay following cursor */}
                {zoomState.isHovering && (
                  <div
                    className="absolute border-2 border-[#967BB6] bg-[#967BB6]/20 backdrop-blur-[1px] rounded-lg pointer-events-none hidden lg:block shadow-md transition-all duration-75"
                    style={{
                      width: '90px',
                      height: '112px',
                      left: `${zoomState.lensX}px`,
                      top: `${zoomState.lensY}px`,
                    }}
                  />
                )}

                {product.isNewArrival && (
                  <span className="absolute top-3 left-3 bg-[#967BB6] text-white text-[9px] sm:text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider rounded-md shadow-xs pointer-events-none">
                    New Arrival
                  </span>
                )}

                {/* Hint Badge */}
                <div className="absolute bottom-3 right-3 bg-black/65 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-bold items-center gap-1 hidden lg:flex pointer-events-none opacity-85 transition-opacity">
                  <ZoomIn className="w-3 h-3 text-[#fffeea]" />
                  <span>Hover to Zoom</span>
                </div>
              </div>

              {/* Side Magnifier Window (Exclusive Zoom View) */}
              {zoomState.isHovering && (
                <div
                  className="absolute left-[calc(100%+1rem)] top-0 z-50 w-[320px] h-[400px] xl:w-[380px] xl:h-[475px] bg-white rounded-2xl border-2 border-[#967BB6]/60 shadow-2xl overflow-hidden pointer-events-none hidden lg:block animate-fade-in bg-no-repeat"
                  style={{
                    backgroundImage: `url(${currentImageSrc})`,
                    backgroundPosition: `${zoomState.xPercent}% ${zoomState.yPercent}%`,
                    backgroundSize: '280% 280%',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div className="absolute top-2.5 right-2.5 bg-[#1A1821]/85 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3 h-3 text-brand-yellow" />
                    <span>HD Zoom View</span>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 justify-center w-full scrollbar-none">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`w-12 sm:w-14 aspect-[4/5] rounded-lg border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                      activeImage === idx
                        ? 'border-[#967BB6] ring-2 ring-[#967BB6]/25 scale-95'
                        : 'border-[#EAE6DB] opacity-70 hover:opacity-100 hover:border-[#967BB6]/50'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover object-center" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Details & Actions (7 Cols) */}
          <div className="lg:col-span-7 space-y-4 w-full">
            <div className="space-y-2 border-b border-[#EAE6DB] pb-4">
              {/* Category, Rating & Status Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#967BB6] bg-[#967BB6]/10 px-2.5 py-0.5 rounded-md">
                  {product.subCategory || product.category}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                  ★ {product.rating || 4.9} ({product.reviewCount || 12} reviews)
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  In Stock
                </span>
              </div>

              {/* Big Prominent Product Title */}
              <h1 className="font-sans font-black text-2xl sm:text-3xl lg:text-[34px] xl:text-[38px] text-brand-charcoal uppercase leading-[1.12] tracking-tight">
                {product.name}
              </h1>

              {/* Price Box */}
              <div className="flex flex-wrap items-baseline gap-2.5 pt-1">
                <span className="text-2xl sm:text-3xl font-black text-brand-charcoal">
                  Rs. {product.price.toLocaleString('en-IN')}.00
                </span>
                {product.originalPrice > product.price && (
                  <>
                    <span className="text-sm sm:text-base text-brand-muted-light line-through font-semibold">
                      Rs. {product.originalPrice.toLocaleString('en-IN')}.00
                    </span>
                    <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-wider uppercase shadow-xs">
                      Save {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-brand-muted font-medium">
                Tax included. Free express shipping on all prepaid orders.
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
              <div className="flex items-center border border-[#EAE6DB] bg-[#fffeea] px-2.5 py-2 text-xs font-bold shrink-0">
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
                    : 'border-[#EAE6DB] text-brand-charcoal hover:bg-[#fffeea]'
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

          {/* USPs Bullets / Highlights */}
          {(() => {
            const highlightsList = (product.highlights && product.highlights.length > 0)
              ? product.highlights
              : [
                  'Free Delivery on all prepaid orders',
                  '7-Day Hassle-Free Size Exchange',
                  '100% Anti-Tarnish & Waterproof'
                ];

            return (
              <div className="p-3.5 bg-[#fffeea] border border-[#EAE6DB] space-y-1.5 text-xs">
                {highlightsList.map((item, idx) => {
                  const IconComponent = idx === 0 ? Truck : idx === 1 ? RefreshCw : Sparkles;
                  return (
                    <div key={idx} className="flex items-center gap-2 font-bold text-brand-charcoal">
                      <IconComponent className="w-3.5 h-3.5 text-brand-lavender shrink-0" />
                      <span>{item}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

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
                <div className="pb-3 text-xs text-brand-muted leading-relaxed space-y-2 whitespace-pre-line">
                  <p>{product.description || 'Crafted with premium quality materials designed for ultra-lightweight all-day comfort.'}</p>
                  {product.material && <p><strong>Material:</strong> {product.material}</p>}
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
                  {((product.careInstructions && product.careInstructions.length > 0)
                    ? product.careInstructions
                    : ['Simply wipe clean with a dry cloth']
                  ).map((c, i) => (
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
                <div className="pb-3 text-xs text-brand-muted leading-relaxed whitespace-pre-line">
                  {product.deliveryPolicy || 'Dispatched within 24 hours. Delivered across India within 2 to 4 business days. Easy 7-day exchange support available on WhatsApp.'}
                </div>
              )}
            </div>
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
