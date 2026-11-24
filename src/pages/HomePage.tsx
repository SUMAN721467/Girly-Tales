import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, Feather, Truck, HeartHandshake, Sparkles, 
  Package, RefreshCw, RotateCcw, Gift, CheckCircle, 
  Star, Heart, Clock, Award, Headphones,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Video, X, Play, Maximize2,
  RotateCw, VideoOff, Loader2
} from 'lucide-react';
import { Product } from '../types/product';
import { ProductCard } from '../components/product/ProductCard';
import { BannerCarousel } from '../components/home/BannerCarousel';
import { ComfortMarquee } from '../components/home/ComfortMarquee';
import { CategorySlider } from '../components/home/CategorySlider';
import { TestimonialsSection } from '../components/home/TestimonialsSection';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { DatabaseService, RealCategory, HomepageConfig } from '../lib/databaseService';
import { isSupabaseConfigured } from '../lib/supabase';
import { MOCK_PRODUCTS } from '../data/products';
import slide1 from '../assets/slide1.jpg';
import slide2 from '../assets/slide2.jpg';

const renderValuePropIcon = (iconStr?: string) => {
  if (!iconStr) return <Sparkles className="w-6 h-6 text-[#967BB6]" />;
  const clean = iconStr.trim().toLowerCase();

  switch (clean) {
    case 'shieldcheck':
    case 'shield':
    case 'shield-check':
      return <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    case 'feather':
      return <Feather className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    case 'truck':
    case 'delivery':
      return <Truck className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    case 'rotateccw':
    case 'rotate-ccw':
    case 'exchange':
      return <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    case 'refreshcw':
    case 'refresh':
      return <RefreshCw className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    case 'hearthandshake':
    case 'heart-handshake':
    case 'returns':
      return <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    case 'gift':
      return <Gift className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    case 'checkcircle':
    case 'check':
      return <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    case 'star':
      return <Star className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    case 'heart':
      return <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    case 'clock':
      return <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    case 'award':
      return <Award className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    case 'headphones':
    case 'support':
      return <Headphones className="w-6 h-6 sm:w-7 sm:h-7 text-[#967BB6]" />;
    default:
      return <span className="text-xl sm:text-2xl">{iconStr}</span>;
  }
};

interface ParsedVideoSource {
  type: 'youtube' | 'instagram' | 'googledrive' | 'direct';
  id?: string;
  url: string;
}

const parseVideoSource = (url?: string): ParsedVideoSource | null => {
  if (!url) return null;
  const raw = url.trim();
  if (!raw) return null;

  // 1. YouTube & YouTube Shorts (handles youtu.be, shorts/, watch?v=, embed/, mobile)
  const ytMatch = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return { type: 'youtube', id: ytMatch[1], url: raw };
  }

  // 2. Instagram Reel or Post
  const igMatch = raw.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (igMatch && igMatch[1]) {
    return { type: 'instagram', id: igMatch[1], url: raw };
  }

  // 3. Google Drive Video
  const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return { type: 'googledrive', id: driveMatch[1], url: raw };
  }

  // 4. Direct video URL (MP4, WebM, Cloudinary, S3, Supabase, Google Storage, etc.)
  return { type: 'direct', url: raw };
};

interface InfluencerReelCardProps {
  reel: any;
  items: any[];
  isLoggedIn: boolean;
  user: any;
  openAuthModal: (mode: any) => void;
  addToCart: (product: any, qty: number) => void;
  openCart: () => void;
  onSelectProduct: (product: Product) => void;
  onOpenReelModal: (reel: any) => void;
}

const InfluencerReelCard: React.FC<InfluencerReelCardProps> = ({
  reel,
  items,
  isLoggedIn,
  user,
  openAuthModal,
  addToCart,
  openCart,
  onSelectProduct,
  onOpenReelModal,
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const parsed = useMemo(() => parseVideoSource(reel.videoUrl), [reel.videoUrl]);

  // Robust HTML5 video autoplay attempt
  const attemptPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.defaultMuted = true;
    v.muted = isMuted;
    const promise = v.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
          setHasError(false);
        })
        .catch(() => {
          // If unmuted playback failed or was blocked by browser, force muted and retry
          v.muted = true;
          v.play()
            .then(() => {
              setIsPlaying(true);
              setIsLoading(false);
            })
            .catch(() => {
              // Browser requires user gesture to start playback
              setIsPlaying(false);
              setIsLoading(false);
            });
        });
    }
  };

  useEffect(() => {
    if (parsed?.type === 'direct') {
      setIsLoading(true);
      setHasError(false);
      attemptPlay();
    } else {
      setIsLoading(false);
      setHasError(false);
    }
  }, [parsed?.url]);

  // Handle Mute / Unmute
  const toggleSound = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    const v = videoRef.current;
    if (v) {
      v.muted = nextMuted;
      if (!nextMuted && v.paused) {
        v.play().catch(() => {});
      }
    }

    if (parsed?.type === 'youtube' && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: nextMuted ? 'mute' : 'unMute',
            args: [],
          }),
          '*'
        );
      } catch {}
    }
  };

  // Direct Tap to Play if Autoplay was blocked
  const handleUserPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (v) {
      v.muted = isMuted;
      v.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch(() => {});
    }
  };

  const isReelProdInCart = items.some((item) => item.product.id === reel.product.id);

  return (
    <div className="w-[230px] min-w-[230px] sm:w-[260px] sm:min-w-[260px] md:w-[280px] md:min-w-[280px] snap-start shrink-0 bg-white border border-[#EAE6DB] rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300 group">
      {/* Media Container (Pure Autoplay Video - No Thumbnail) */}
      <div
        onClick={toggleSound}
        className="relative aspect-[9/15] overflow-hidden cursor-pointer group bg-black select-none"
        title="Tap to toggle sound"
      >
        {/* 1. YouTube & YouTube Shorts */}
        {parsed?.type === 'youtube' && (
          <div className="relative w-full h-full overflow-hidden bg-black pointer-events-auto">
            <iframe
              ref={iframeRef}
              src={`https://www.youtube-nocookie.com/embed/${parsed.id}?autoplay=1&mute=1&loop=1&playlist=${parsed.id}&controls=0&playsinline=1&modestbranding=1&rel=0&enablejsapi=1`}
              title={reel.tagText}
              className="w-full h-full object-cover scale-105 pointer-events-auto border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}

        {/* 2. Instagram Reel or Post */}
        {parsed?.type === 'instagram' && (
          <div className="relative w-full h-full overflow-hidden bg-black pointer-events-auto">
            <iframe
              src={`https://www.instagram.com/reel/${parsed.id}/embed/`}
              title={reel.tagText}
              className="w-full h-full object-cover border-0"
              allow="autoplay; encrypted-media"
              scrolling="no"
            />
          </div>
        )}

        {/* 3. Google Drive Video */}
        {parsed?.type === 'googledrive' && (
          <div className="relative w-full h-full overflow-hidden bg-black pointer-events-auto">
            <iframe
              src={`https://drive.google.com/file/d/${parsed.id}/preview`}
              title={reel.tagText}
              className="w-full h-full object-cover border-0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        )}

        {/* 4. Direct Video Stream */}
        {parsed?.type === 'direct' && (
          <div className="relative w-full h-full overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={parsed.url}
              playsInline
              loop
              autoPlay
              muted={isMuted}
              preload="auto"
              onCanPlay={() => {
                setIsLoading(false);
                setHasError(false);
                const v = videoRef.current;
                if (v && v.paused) {
                  v.play().catch(() => {});
                }
              }}
              onLoadedData={() => {
                setIsLoading(false);
                setHasError(false);
                const v = videoRef.current;
                if (v && v.paused) {
                  v.play().catch(() => {});
                }
              }}
              onPlaying={() => {
                setIsPlaying(true);
                setIsLoading(false);
                setHasError(false);
              }}
              onWaiting={() => setIsLoading(true)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />

            {/* Loading Indicator */}
            {isLoading && !hasError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-2xs z-10 pointer-events-none">
                <Loader2 className="w-8 h-8 text-[#967BB6] animate-spin" />
              </div>
            )}

            {/* Fallback Tap to Play if Autoplay was blocked */}
            {!isPlaying && !isLoading && !hasError && (
              <div
                onClick={handleUserPlay}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-20 cursor-pointer p-4 text-center group/play"
              >
                <div className="w-14 h-14 rounded-full bg-[#967BB6] text-white flex items-center justify-center shadow-lg group-hover/play:scale-110 transition-transform mb-2">
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </div>
                <p className="text-white text-xs font-bold drop-shadow">Tap to Play Video</p>
              </div>
            )}

            {/* Error Fallback */}
            {hasError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1A1821] text-white/80 p-4 text-center z-20 space-y-2">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <VideoOff className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Video Unavailable</p>
                  <p className="text-[10px] text-white/60 mt-0.5 line-clamp-2">
                    Check or update link in Admin
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHasError(false);
                    setIsLoading(true);
                    if (videoRef.current) {
                      videoRef.current.load();
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!parsed && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#1A1821] text-white/50 text-xs gap-1">
            <Video className="w-8 h-8 text-[#967BB6]" />
            <span>No Video Link</span>
          </div>
        )}

        {/* Top Tag Overlay */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 text-white drop-shadow-md pointer-events-none">
          <span className="font-handwritten text-xl sm:text-2xl text-[#fffeea] block font-bold leading-tight">
            {reel.tagText}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-wide uppercase">
            {reel.subTag}
          </span>
        </div>

        {/* Top Right: Expand to Modal & Views Badge */}
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenReelModal(reel);
            }}
            className="bg-black/60 hover:bg-[#967BB6] text-white p-1 rounded-md backdrop-blur-xs transition-colors cursor-pointer shadow-sm"
            title="Expand Full Reel"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <div className="bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
            👁️ {reel.views}
          </div>
        </div>

        {/* Bottom Right: Audio Toggle Button (For Mute / Unmute) */}
        {parsed && parsed.type !== 'instagram' && (
          <button
            type="button"
            onClick={toggleSound}
            className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/80 hover:bg-black/95 backdrop-blur-md text-white text-[10px] font-bold tracking-wide transition-all cursor-pointer shadow-lg border border-white/20 active:scale-95"
            title={isMuted ? 'Click to unmute sound' : 'Mute sound'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-300" />
                <span>Unmute</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                <span>Sound On</span>
              </>
            )}
          </button>
        )}

        {/* Subtle hover prompt indicating tap to toggle sound */}
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-xs text-white text-[10px] font-medium shadow-md">
            {isMuted ? 'Tap to unmute' : 'Tap to mute'}
          </span>
        </div>
      </div>

      {/* Product Info Strip & Add to Cart Button */}
      <div className="p-3 bg-white space-y-2 border-t border-[#EAE6DB]">
        <div
          onClick={() => onSelectProduct(reel.product)}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <img
            src={reel.product.images[0]}
            alt={reel.product.name}
            className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded-lg border border-gray-200 shrink-0"
          />
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-bold text-brand-charcoal truncate">
              {reel.product.name}
            </p>
            <p className="text-xs font-black text-brand-charcoal">
              ₹{reel.product.price}
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isReelProdInCart) {
              openCart();
              return;
            }
            if (!isLoggedIn || !user) {
              openAuthModal('login');
              return;
            }
            addToCart(reel.product, 1);
            openCart();
          }}
          className="w-full py-2 bg-[#FBB6CE] hover:bg-[#F89CBA] text-[#1A1821] text-[11px] sm:text-xs font-black tracking-wider uppercase rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          {isReelProdInCart ? 'Go to Cart' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

interface HomePageProps {
  onNavigate: (page: string, category?: string) => void;
  onSelectProduct: (product: Product) => void;
  onQuickView: (product: Product) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectProduct,
}) => {
  const { items, addToCart, openCart } = useCart();
  const { user, isLoggedIn, openAuthModal } = useAuth();
  const [productsList, setProductsList] = useState<Product[]>(() => DatabaseService.getCachedProducts());
  const [dbCategories, setDbCategories] = useState<RealCategory[]>(() => {
    const cached = DatabaseService.getCachedCategories();
    return cached.length > 0 ? cached.filter((c) => c.isActive) : [];
  });
  const [homeConfig, setHomeConfig] = useState<HomepageConfig>(() => DatabaseService.getCachedHomepageConfig());

  // Influencer Reels Horizontal Scroll & Modal State
  const reelsContainerRef = useRef<HTMLDivElement>(null);
  const [activeReelModal, setActiveReelModal] = useState<any | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollReels = (direction: 'left' | 'right') => {
    if (reelsContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      reelsContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleReelsScroll = () => {
    if (reelsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = reelsContainerRef.current;
      setCanScrollLeft(scrollLeft > 15);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 15);
    }
  };

  const loadHomeData = async () => {
    try {
      const [prods, cats, config] = await Promise.all([
        DatabaseService.getProducts(),
        DatabaseService.getCategories(true),
        DatabaseService.getHomepageConfig(true),
      ]);
      if (Array.isArray(prods)) {
        setProductsList(prods);
      }
      if (Array.isArray(cats)) {
        setDbCategories(cats.filter((c) => c.isActive));
      }
      if (config) {
        setHomeConfig(config);
      }
    } catch (e) {
      console.warn('Failed to load home data:', e);
      if (!isSupabaseConfigured) {
        setProductsList(MOCK_PRODUCTS);
      }
    }
  };

  useEffect(() => {
    loadHomeData();

    const handleSync = (e: any) => {
      const type = e.detail?.type;
      if (!type || type === 'products' || type === 'categories' || type === 'homepage' || type === 'settings' || type === 'all') {
        loadHomeData();
      }
    };

    window.addEventListener('gt_db_sync', handleSync);
    return () => window.removeEventListener('gt_db_sync', handleSync);
  }, []);

  const sliderCategories = useMemo(() => {
    if (homeConfig.categoryCards && homeConfig.categoryCards.length > 0) {
      const activeCards = homeConfig.categoryCards.filter((c) => c.active !== false);
      if (activeCards.length > 0) {
        return activeCards.map((c) => ({
          id: c.id,
          name: c.name.toUpperCase(),
          tagline: c.tagline,
          image: c.image || slide1,
          category: c.category,
          ctaText: c.ctaText || `SHOP ${c.name.toUpperCase()}`,
        }));
      }
    }

    if (dbCategories.length === 0) return undefined;
    return dbCategories.map((c, idx) => ({
      id: c.id,
      name: c.name.toUpperCase(),
      tagline: c.slug.includes('jewel') || c.slug.includes('ring') || c.slug.includes('neck') 
        ? 'Waterproof, Shower-Safe & Hypoallergenic' 
        : 'Cloud-Soft Luxury Living',
      image: idx % 2 === 0 ? slide1 : slide2,
      category: c.slug,
      ctaText: `SHOP ${c.name.toUpperCase()}`,
    }));
  }, [homeConfig.categoryCards, dbCategories]);

  const influencerReels = useMemo(() => {
    if (!productsList || productsList.length === 0) return [];
    const sourceReels = homeConfig.influencerReels && homeConfig.influencerReels.length > 0
      ? homeConfig.influencerReels.filter((r) => r.active !== false)
      : [];

    return sourceReels.map((cfg, idx) => {
      const prod = (cfg.productId ? productsList.find((p) => p.id === cfg.productId) : null) || productsList[idx % productsList.length];
      return {
        ...cfg,
        product: prod,
      };
    }).filter((r) => !!r.product);
  }, [homeConfig.influencerReels, productsList]);

  const matchProductToCategory = (product: Product, cat: RealCategory): boolean => {
    const catSlug = (cat.slug || '').toLowerCase().trim();
    const catName = (cat.name || '').toLowerCase().trim();
    const prodCat = (product.category || '').toLowerCase().trim();
    const prodSub = (product.subCategory || '').toLowerCase().trim();
    const prodName = (product.name || '').toLowerCase().trim();

    const cleanCatSlug = catSlug.replace(/[^a-z0-9]/g, '');
    const cleanCatName = catName.replace(/[^a-z0-9]/g, '');
    const cleanProdCat = prodCat.replace(/[^a-z0-9]/g, '');
    const cleanProdSub = prodSub.replace(/[^a-z0-9]/g, '');

    // 1. Direct or stripped match
    if (prodCat === catSlug || prodCat === catName) return true;
    if (cleanCatSlug && cleanProdCat === cleanCatSlug) return true;
    if (cleanCatName && cleanProdCat === cleanCatName) return true;

    // 2. Subcategory match
    if (catSlug && prodSub.includes(catSlug)) return true;
    if (catName && prodSub.includes(catName)) return true;
    if (cleanCatSlug && cleanProdSub.includes(cleanCatSlug)) return true;
    if (cleanCatName && cleanProdSub.includes(cleanCatName)) return true;

    // 3. Specs match
    const specCat = String(product.specs?.['Category'] || '').toLowerCase().trim();
    if (specCat) {
      const cleanSpecCat = specCat.replace(/[^a-z0-9]/g, '');
      if (cleanSpecCat === cleanCatSlug || cleanSpecCat === cleanCatName) return true;
    }

    // 4. Keyword / Semantic Department Matching
    // Jewellery
    if (catSlug.includes('jewel') || catName.includes('jewel')) {
      if (
        prodCat.includes('jewel') ||
        prodSub.includes('jewel') ||
        prodSub.includes('ring') ||
        prodSub.includes('necklace') ||
        prodSub.includes('earring') ||
        prodSub.includes('bracelet') ||
        prodSub.includes('anklet') ||
        prodName.includes('necklace') ||
        prodName.includes('earring') ||
        prodName.includes('bracelet') ||
        prodName.includes('ring') ||
        prodName.includes('jewel')
      ) {
        return true;
      }
    }

    // Nightwear
    if (
      catSlug.includes('night') ||
      catName.includes('night') ||
      catSlug.includes('sleep') ||
      catName.includes('sleep') ||
      catSlug.includes('pajama') ||
      catSlug.includes('pyjama')
    ) {
      if (
        prodCat.includes('night') ||
        prodSub.includes('night') ||
        prodSub.includes('suit') ||
        prodSub.includes('pyjama') ||
        prodSub.includes('pajama') ||
        prodSub.includes('pj') ||
        prodSub.includes('satin') ||
        prodSub.includes('modal') ||
        prodSub.includes('hosiery') ||
        prodSub.includes('cotton') ||
        prodSub.includes('robe') ||
        prodName.includes('night') ||
        prodName.includes('suit') ||
        prodName.includes('pyjama') ||
        prodName.includes('pajama')
      ) {
        return true;
      }
    }

    // Hair Accessories
    if (catSlug.includes('hair') || catName.includes('hair') || catSlug.includes('acces') || catName.includes('acces')) {
      if (
        prodCat.includes('hair') ||
        prodSub.includes('hair') ||
        prodSub.includes('scrunchie') ||
        prodSub.includes('clip') ||
        prodSub.includes('claw') ||
        prodSub.includes('band') ||
        prodName.includes('hair') ||
        prodName.includes('scrunchie') ||
        prodName.includes('clip') ||
        prodName.includes('claw') ||
        prodName.includes('headband')
      ) {
        return true;
      }
    }

    // Soft Toys / Keychains / Bag Charms
    if (
      catSlug.includes('toy') ||
      catName.includes('toy') ||
      catSlug.includes('keychain') ||
      catName.includes('keychain') ||
      catSlug.includes('plush') ||
      catName.includes('plush')
    ) {
      if (
        prodCat.includes('toy') ||
        prodCat.includes('keychain') ||
        prodCat.includes('plush') ||
        prodSub.includes('toy') ||
        prodSub.includes('keychain') ||
        prodSub.includes('plush') ||
        prodSub.includes('charm') ||
        prodName.includes('keychain') ||
        prodName.includes('plush') ||
        prodName.includes('charm') ||
        prodName.includes('toy')
      ) {
        return true;
      }
    }

    return false;
  };

  const categoryProductSections = useMemo(() => {
    if (!productsList || productsList.length === 0) return [];

    // Prioritize active database categories from admin, falling back to standard categories
    const baseCategories: RealCategory[] = (dbCategories && dbCategories.length > 0)
      ? [...dbCategories].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      : [
          { id: 'cat-jewellery', name: 'JEWELLERY', slug: 'jewellery', isActive: true, orderIndex: 0 },
          { id: 'cat-nightwear', name: 'NIGHTWEAR', slug: 'nightwear', isActive: true, orderIndex: 1 },
          { id: 'cat-hair-accessories', name: 'HAIR ACCESSORIES', slug: 'hair-accessories', isActive: true, orderIndex: 2 },
          { id: 'cat-soft-toys-keychains', name: 'SOFT TOYS KEYCHAINS', slug: 'soft-toys-keychains', isActive: true, orderIndex: 3 },
        ];

    const inStock = productsList.filter((p) => p.inStock !== false);
    const candidates = inStock.length > 0 ? inStock : productsList;

    return baseCategories
      .map((cat) => {
        const matching = candidates.filter((p) => matchProductToCategory(p, cat));
        return {
          category: cat,
          products: matching.slice(0, 4),
        };
      })
      .filter((sec) => sec.products.length > 0);
  }, [productsList, dbCategories]);

  return (
    <div className="pb-16 bg-[#fffeea] w-full">
      {/* 1. FULL-WIDTH HERO CAROUSEL BANNER */}
      <section className="w-full">
        <BannerCarousel
          banners={homeConfig.heroBanners}
          autoplaySeconds={homeConfig.bannerAutoplaySeconds}
          onNavigate={onNavigate}
        />
      </section>

      {/* 2. CONTINUOUS TICKER MARQUEE RIBBON */}
      <ComfortMarquee phrases={homeConfig.marqueePhrases} />

      {/* 3. THE ESSENTIALS - SHOP BY CATEGORY */}
      <section className="w-full mt-3 sm:mt-5">
        <CategorySlider
          categories={sliderCategories}
          sectionTitle={homeConfig.categorySectionTitle}
          onNavigate={onNavigate}
        />
      </section>

      {/* 4. DYNAMIC CATEGORY SHOWCASE SECTIONS (4 PRODUCTS PER CATEGORY) */}
      {categoryProductSections.map(({ category: cat, products }) => (
        <section
          key={cat.id || cat.slug}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-14"
        >
          <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
            <h2 className="font-sans font-black text-lg sm:text-2xl md:text-3xl text-brand-charcoal uppercase tracking-tight">
              {cat.name}
            </h2>

            <button
              type="button"
              onClick={() => onNavigate('shop', cat.slug)}
              className="bg-[#FBB6CE] hover:bg-[#F89CBA] text-[#1A1821] px-3.5 sm:px-6 py-2 rounded text-[11px] sm:text-xs font-black tracking-wider uppercase transition-all shadow-xs shrink-0 cursor-pointer"
            >
              VIEW ALL {cat.name}
            </button>
          </div>

          {/* Responsive Product Grid - 1 Row (4 columns on desktop/tablet) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        </section>
      ))}

      {/* 6. INFLUENCER-APPROVED COMFORT & SHINE */}
      {influencerReels.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#967BB6]" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#967BB6]">
                  Real People, Real Looks
                </span>
              </div>
              <h2 className="font-sans font-black text-xl sm:text-2xl md:text-3xl text-brand-charcoal uppercase tracking-tight">
                {homeConfig.influencerTitle || 'Influencer-Approved Comfort'}
              </h2>
              <p className="text-xs sm:text-sm text-brand-muted max-w-2xl">
                {homeConfig.influencerSubtitle || 'Discover how influencers style our nightwear & jewellery and shop their curated picks.'}
              </p>
            </div>

            {/* Scroll Navigation Arrows */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span className="text-xs font-bold text-brand-muted hidden md:inline-block mr-1">
                {influencerReels.length} Videos
              </span>
              <button
                type="button"
                onClick={() => scrollReels('left')}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
                className="w-9 h-9 rounded-full bg-white border border-[#EAE6DB] hover:bg-[#F3EEF9] hover:border-[#967BB6] flex items-center justify-center text-brand-charcoal hover:text-[#967BB6] transition-all shadow-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollReels('right')}
                disabled={!canScrollRight}
                aria-label="Scroll right"
                className="w-9 h-9 rounded-full bg-white border border-[#EAE6DB] hover:bg-[#F3EEF9] hover:border-[#967BB6] flex items-center justify-center text-brand-charcoal hover:text-[#967BB6] transition-all shadow-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Scroll Track (Scrollable everywhere) */}
          <div className="relative group/carousel">
            {/* Floating Left Button (Desktop) */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollReels('left')}
                aria-label="Scroll Left"
                className="hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-brand-charcoal shadow-lg border border-[#EAE6DB] items-center justify-center transition-all opacity-0 group-hover/carousel:opacity-100 hover:scale-110 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 text-brand-charcoal" />
              </button>
            )}

            {/* Floating Right Button (Desktop) */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollReels('right')}
                aria-label="Scroll Right"
                className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-brand-charcoal shadow-lg border border-[#EAE6DB] items-center justify-center transition-all opacity-0 group-hover/carousel:opacity-100 hover:scale-110 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 text-brand-charcoal" />
              </button>
            )}

            <div
              ref={reelsContainerRef}
              onScroll={handleReelsScroll}
              className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-4 pt-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {influencerReels.map((reel) => (
                <InfluencerReelCard
                  key={reel.id}
                  reel={reel}
                  items={items}
                  isLoggedIn={isLoggedIn}
                  user={user}
                  openAuthModal={openAuthModal}
                  addToCart={addToCart}
                  openCart={openCart}
                  onSelectProduct={onSelectProduct}
                  onOpenReelModal={setActiveReelModal}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Video Reel Modal Pop-up */}
      {activeReelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative bg-[#1A1821] text-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-white/10 flex flex-col">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveReelModal(null)}
              className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Video Player */}
            <div className="relative aspect-[9/15] w-full bg-black overflow-hidden flex items-center justify-center">
              {(() => {
                const modalParsed = parseVideoSource(activeReelModal.videoUrl);
                if (modalParsed?.type === 'youtube') {
                  return (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${modalParsed.id}?autoplay=1&controls=1&modestbranding=1&playsinline=1`}
                      title={activeReelModal.tagText}
                      className="w-full h-full object-cover border-0"
                      allow="autoplay; encrypted-media; fullscreen"
                      allowFullScreen
                    />
                  );
                }
                if (modalParsed?.type === 'instagram') {
                  return (
                    <iframe
                      src={`https://www.instagram.com/reel/${modalParsed.id}/embed/`}
                      title={activeReelModal.tagText}
                      className="w-full h-full object-cover border-0"
                      allow="autoplay; encrypted-media"
                      scrolling="no"
                    />
                  );
                }
                if (modalParsed?.type === 'googledrive') {
                  return (
                    <iframe
                      src={`https://drive.google.com/file/d/${modalParsed.id}/preview`}
                      title={activeReelModal.tagText}
                      className="w-full h-full object-cover border-0"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  );
                }
                if (modalParsed?.type === 'direct') {
                  return (
                    <video
                      src={modalParsed.url}
                      playsInline
                      loop
                      autoPlay
                      controls
                      className="w-full h-full object-cover"
                    />
                  );
                }
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/50 text-xs">
                    <Video className="w-10 h-10 text-[#967BB6] mb-2" />
                    <span>No Video Link Available</span>
                  </div>
                );
              })()}

              {/* Top Tag Overlay */}
              <div className="absolute top-4 left-4 z-20 pointer-events-none drop-shadow">
                <span className="font-handwritten text-2xl text-[#fffeea] block font-bold leading-tight">
                  {activeReelModal.tagText}
                </span>
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  {activeReelModal.subTag}
                </span>
              </div>
            </div>

            {/* Pinned Product Strip & Add to Cart */}
            <div className="p-3.5 bg-white text-brand-charcoal flex items-center justify-between gap-3">
              <div
                onClick={() => {
                  setActiveReelModal(null);
                  onSelectProduct(activeReelModal.product);
                }}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
              >
                <img
                  src={activeReelModal.product.images[0]}
                  alt={activeReelModal.product.name}
                  className="w-11 h-11 object-cover rounded-xl border border-gray-200 shrink-0"
                />
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-bold truncate text-brand-charcoal">
                    {activeReelModal.product.name}
                  </p>
                  <p className="text-xs font-black text-brand-charcoal">
                    ₹{activeReelModal.product.price}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  addToCart(activeReelModal.product, 1);
                  setActiveReelModal(null);
                  openCart();
                }}
                className="px-4 py-2 bg-[#FBB6CE] hover:bg-[#F89CBA] text-[#1A1821] text-xs font-black uppercase rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. VERIFIED CUSTOMER TESTIMONIALS & REVIEWS */}
      <TestimonialsSection
        products={productsList}
        onSelectProduct={onSelectProduct}
        homeConfig={homeConfig}
      />

      {/* 6. BRAND VALUE PROPOSITION STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 bg-white border border-[#EAE6DB] p-4 sm:p-6 text-center">
          {(homeConfig.valueProps && homeConfig.valueProps.length > 0 ? homeConfig.valueProps : [
            { id: '1', icon: 'ShieldCheck', title: 'Anti-Tarnish Guarantee', description: '316-L Stainless Steel' },
            { id: '2', icon: 'Feather', title: 'Cloud-Soft Fabrics', description: 'Soft, airy & gentle on skin' },
            { id: '3', icon: 'Truck', title: 'Fast Pan-India Delivery', description: 'Express 24h dispatch' },
            { id: '4', icon: 'RotateCcw', title: 'Hassle-Free Exchange', description: '7-Day Easy Doorstep Exchange' },
          ]).map((rawVp) => {
            const isReturns = /return/i.test(rawVp.title);
            const isAntiTarnish = /anti[- ]?tarnish/i.test(rawVp.title) || /vacuum plating/i.test(String(rawVp.description || ''));
            let vp = rawVp;
            if (isReturns) {
              vp = {
                ...rawVp,
                icon: 'RotateCcw',
                title: 'Hassle-Free Exchange',
                description: !/return/i.test(rawVp.description) ? rawVp.description : '7-Day Easy Doorstep Exchange',
              };
            } else if (isAntiTarnish) {
              vp = {
                ...rawVp,
                icon: 'ShieldCheck',
                title: rawVp.title || 'Anti-Tarnish Guarantee',
                description: '316-L Stainless Steel',
              };
            }

            return (
              <div key={vp.id} className="space-y-1.5 p-2 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-2xl bg-[#967BB6]/10 flex items-center justify-center text-[#967BB6] mb-1">
                  {renderValuePropIcon(vp.icon)}
                </div>
                <h4 className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-brand-charcoal">
                  {vp.title}
                </h4>
                <p className="text-[10px] sm:text-[11px] text-brand-muted">{vp.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
