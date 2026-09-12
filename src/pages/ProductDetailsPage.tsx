import React, { useState, useEffect, useRef } from 'react';
import { Heart, Sparkles, Truck, RefreshCw, ChevronDown, ChevronUp, Ruler, ArrowLeft, ZoomIn, CheckCircle, Camera, Image as ImageIcon, Plus, Trash2, X, Loader2, Star, ShoppingBag, ArrowRight } from 'lucide-react';
import { Product } from '../types/product';
import { ProductCard } from '../components/product/ProductCard';
import { SizeGuideModal } from '../components/common/SizeGuideModal';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { DatabaseService, RealReview } from '../lib/databaseService';

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

  // Reviews State
  const [productReviews, setProductReviews] = useState<RealReview[]>([]);
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewImages, setNewReviewImages] = useState<string[]>([]);
  const [isUploadingReviewImg, setIsUploadingReviewImg] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const reviewFileInputRef = useRef<HTMLInputElement>(null);

  const loadReviews = async () => {
    try {
      const allRev = await DatabaseService.getReviews(product.id);
      if (Array.isArray(allRev)) {
        setProductReviews(allRev);
      }
    } catch (e) {}
  };

  useEffect(() => {
    DatabaseService.getProducts().then((prods) => {
      if (Array.isArray(prods)) {
        setProductsList(prods);
      }
    });
    loadReviews();

    const handleSync = (e: any) => {
      if (!e.detail?.type || e.detail?.type === 'reviews' || e.detail?.type === 'all') {
        loadReviews();
      }
    };
    window.addEventListener('gt_db_sync', handleSync);
    return () => window.removeEventListener('gt_db_sync', handleSync);
  }, [product.id]);

  const handleReviewPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setIsUploadingReviewImg(true);
    try {
      for (const file of files) {
        const uploadedUrl = await DatabaseService.uploadReviewImage(file);
        if (uploadedUrl) {
          setNewReviewImages((prev) => [...prev, uploadedUrl]);
        }
      }
    } catch (err) {
      console.warn('Review photo upload error:', err);
    } finally {
      setIsUploadingReviewImg(false);
      if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      const added = await DatabaseService.addReview({
        productId: product.id,
        productName: product.name,
        author: newReviewAuthor.trim(),
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        images: newReviewImages,
        verified: true,
        status: 'Approved',
      });
      setProductReviews((prev) => [added, ...prev]);
      setReviewSuccessMsg('Thank you! Your verified review with photos has been published.');
      setNewReviewAuthor('');
      setNewReviewComment('');
      setNewReviewRating(5);
      setNewReviewImages([]);
      setTimeout(() => {
        setIsWritingReview(false);
        setReviewSuccessMsg('');
      }, 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
    reviews: true,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { items, addToCart, openCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user, isLoggedIn, openAuthModal } = useAuth();

  const isFavorited = isInWishlist(product.id);
  const isProductInCart = items.some((item) => item.product.id === product.id);

  const handleAddToCart = () => {
    if (!isLoggedIn || !user) {
      openAuthModal('login');
      return;
    }
    addToCart(product, quantity, selectedSize);
    openCart();
  };

  const handleBuyNow = () => {
    if (!isLoggedIn || !user) {
      openAuthModal('login');
      return;
    }
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

  const visibleReviews = productReviews.filter(
    (r) => r.productId === product.id && (r.status === 'Approved' || r.status === 'Featured')
  );
  const reviewCount = visibleReviews.length;
  const averageRating =
    reviewCount > 0
      ? (visibleReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / reviewCount).toFixed(1)
      : null;

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
                  ★ {averageRating ? `${averageRating} (${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})` : 'No reviews yet'}
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

              {/* Add to Cart / Go to Cart */}
              <button
                onClick={isProductInCart ? openCart : handleAddToCart}
                className={`flex-1 py-3 font-black text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                  isProductInCart
                    ? 'bg-[#1A1821] hover:bg-[#967BB6] text-white ring-2 ring-[#967BB6]/20 active:scale-[0.99]'
                    : 'bg-[#967BB6] hover:bg-brand-lavender-dark text-white'
                }`}
              >
                {isProductInCart ? (
                  <>
                    <ShoppingBag className="w-4 h-4 text-[#FBB6CE]" />
                    <span>Go to Cart</span>
                  </>
                ) : (
                  <span>Add to Cart</span>
                )}
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

            {/* 4. Customer Reviews & Ratings Section (Product-Specific) */}
            <div>
              <button
                onClick={() => toggleAccordion('reviews')}
                className="w-full py-3 flex items-center justify-between text-xs font-black uppercase tracking-wider text-brand-charcoal text-left"
              >
                <div className="flex items-center gap-2">
                  <span>Customer Reviews &amp; Ratings</span>
                  <span className="bg-[#967BB6]/15 text-[#967BB6] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {averageRating ? `★ ${averageRating} (${reviewCount})` : '0 Reviews'}
                  </span>
                </div>
                {openAccordions.reviews ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {openAccordions.reviews && (
                <div className="pb-4 pt-1 space-y-4 text-xs animate-fade-in">
                  {/* Rating Summary Box & Write Review Button */}
                  <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                      <div>
                        <span className="text-3xl font-black text-brand-charcoal block leading-none">
                          {averageRating || '—'}
                        </span>
                        <div className="flex text-amber-500 text-xs mt-1 justify-center sm:justify-start">
                          {averageRating ? '★'.repeat(Math.round(Number(averageRating))) : '☆☆☆☆☆'}
                        </div>
                        <span className="text-[10px] text-brand-muted font-bold block mt-0.5">
                          {reviewCount > 0
                            ? `Based on ${reviewCount} verified customer ${reviewCount === 1 ? 'review' : 'reviews'}`
                            : 'No customer reviews published yet'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsWritingReview(!isWritingReview)}
                      className="px-4 py-2 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{isWritingReview ? 'Close Form' : 'Write a Review'}</span>
                    </button>
                  </div>

                  {/* Customer Write Review Form */}
                  {isWritingReview && (
                    <form onSubmit={handleSubmitReview} className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl space-y-3 shadow-xs animate-scale-up">
                      <div className="flex items-center justify-between border-b border-[#EAE6DB] pb-2">
                        <span className="font-bold text-xs text-brand-charcoal">Write Customer Feedback</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewReviewRating(star)}
                              className="text-amber-500 text-sm hover:scale-110 transition-transform cursor-pointer"
                            >
                              {star <= newReviewRating ? '★' : '☆'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Your Name *</label>
                        <input
                          type="text"
                          required
                          value={newReviewAuthor}
                          onChange={(e) => setNewReviewAuthor(e.target.value)}
                          placeholder="e.g. Priya Sharma"
                          className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-white focus:outline-none focus:border-[#967BB6]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Your Review *</label>
                        <textarea
                          required
                          rows={3}
                          value={newReviewComment}
                          onChange={(e) => setNewReviewComment(e.target.value)}
                          placeholder="Tell us about the fabric, fit, quality and experience..."
                          className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-white focus:outline-none focus:border-[#967BB6]"
                        />
                      </div>

                      {/* Photo Upload Section */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                            Add Customer Photos ({newReviewImages.length})
                          </label>
                          <input
                            ref={reviewFileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleReviewPhotoSelect}
                            className="hidden"
                          />
                          <button
                            type="button"
                            disabled={isUploadingReviewImg}
                            onClick={() => reviewFileInputRef.current?.click()}
                            className="text-[11px] font-bold text-[#967BB6] hover:text-[#7F62A1] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isUploadingReviewImg ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Upload Photos</span>
                              </>
                            )}
                          </button>
                        </div>

                        {newReviewImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {newReviewImages.map((img, idx) => (
                              <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#EAE6DB] bg-white group shadow-2xs">
                                <img src={img} alt={`Review photo ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setNewReviewImages((prev) => prev.filter((_, i) => i !== idx))}
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-sm cursor-pointer"
                                  title="Remove photo"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {reviewSuccessMsg && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-xl font-medium">
                          ✓ {reviewSuccessMsg}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE6DB]">
                        <button
                          type="button"
                          onClick={() => setIsWritingReview(false)}
                          className="px-3.5 py-1.5 text-xs font-bold text-brand-muted hover:text-brand-charcoal cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingReview || isUploadingReviewImg}
                          className="px-5 py-2 bg-[#1A1821] hover:bg-[#967BB6] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          {isSubmittingReview ? 'Publishing...' : 'Submit Review'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Reviews List */}
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
                    {visibleReviews.length > 0 ? (
                      visibleReviews.map((rev) => (
                        <div key={rev.id} className="p-3.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-brand-charcoal">{rev.author}</span>
                              {rev.verified !== false && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                  ✓ Verified Buyer
                                </span>
                              )}
                            </div>
                            <div className="flex text-amber-500 text-[11px]">
                              {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                                <span key={i}>★</span>
                              ))}
                            </div>
                          </div>
                          {rev.title && (
                            <p className="text-xs font-bold text-brand-charcoal">{rev.title}</p>
                          )}
                          <p className="text-xs text-brand-muted leading-relaxed whitespace-pre-line">
                            "{rev.comment}"
                          </p>

                          {/* Customer Review Photos Gallery */}
                          {rev.images && rev.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {rev.images.map((imgUrl, imgIdx) => (
                                <button
                                  key={imgIdx}
                                  type="button"
                                  onClick={() => setLightboxImg(imgUrl)}
                                  className="w-14 h-14 rounded-xl overflow-hidden border border-[#EAE6DB] hover:border-[#967BB6] hover:scale-105 transition-all bg-white shadow-2xs shrink-0 cursor-pointer"
                                  title="Click to view full photo"
                                >
                                  <img src={imgUrl} alt={`Review photo by ${rev.author}`} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          )}

                          <span className="text-[9px] text-stone-400 block font-medium">
                            {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-brand-muted text-xs bg-[#FAF8F2] rounded-2xl border border-[#EAE6DB] space-y-1.5">
                        <span className="text-2xl block">💬</span>
                        <p className="font-bold text-sm text-brand-charcoal">No reviews yet</p>
                        <p className="text-[11px] text-brand-muted max-w-xs mx-auto">
                          Be the first to share your thoughts and photos about this product!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Lightbox Modal for Full-Size Review Photos */}
      {lightboxImg && (
        <div 
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[85vh] bg-white rounded-3xl overflow-hidden border border-[#EAE6DB] shadow-2xl p-2 animate-scale-up"
          >
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={lightboxImg} alt="Review customer photo" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

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
