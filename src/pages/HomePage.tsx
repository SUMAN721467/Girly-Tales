import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Feather, Truck, HeartHandshake, Sparkles, 
  Package, RefreshCw, RotateCcw, Gift, CheckCircle, 
  Star, Heart, Clock, Award, Headphones 
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

  const trendingProducts = useMemo(() => {
    return productsList.filter((p) => p.inStock !== false).slice(0, 4);
  }, [productsList]);

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

      {/* 3. TRENDING THIS SEASON (1 ROW - 4 ITEMS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12">
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <h2 className="font-sans font-black text-lg sm:text-2xl md:text-3xl text-brand-charcoal uppercase tracking-tight">
            {homeConfig.trendingTitle || 'TRENDING THIS SEASON'}
          </h2>

          <button
            onClick={() => onNavigate('shop')}
            className="bg-[#FBB6CE] hover:bg-[#F89CBA] text-[#1A1821] px-3.5 sm:px-6 py-2 rounded text-[11px] sm:text-xs font-black tracking-wider uppercase transition-all shadow-xs shrink-0"
          >
            {homeConfig.trendingCtaText || 'SHOP ALL TRENDING'}
          </button>
        </div>

        {/* Responsive Product Grid - 1 Row (4 columns on desktop/tablet) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-6">
          {trendingProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      </section>

      {/* 4. INFLUENCER-APPROVED COMFORT & SHINE */}
      {influencerReels.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-16">
          <div className="text-center mb-6 sm:mb-8 space-y-1">
            <h2 className="font-sans font-black text-xl sm:text-2xl md:text-3xl text-brand-charcoal uppercase tracking-tight">
              {homeConfig.influencerTitle || 'Influencer-Approved Comfort'}
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted">
              {homeConfig.influencerSubtitle || 'Discover how influencers style our nightwear & jewellery and shop their curated picks.'}
            </p>
          </div>

          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6 overflow-x-auto sm:overflow-visible scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-3 sm:pb-0">
            {influencerReels.map((reel) => (
              <div
                key={reel.id}
                className="w-[210px] min-w-[210px] sm:w-auto sm:min-w-0 snap-start shrink-0 sm:shrink bg-white border border-[#EAE6DB] rounded-xl overflow-hidden flex flex-col justify-between shadow-xs"
              >
                {/* Reel Card Image */}
                <div
                  onClick={() => onSelectProduct(reel.product)}
                  className="relative aspect-[9/14] overflow-hidden cursor-pointer group bg-black"
                >
                  <img
                    src={reel.image}
                    alt={reel.tagText}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                  />

                  {/* Aesthetic Top Tag Overlay */}
                  <div className="absolute top-3 sm:top-4 left-3 sm:left-4 text-white drop-shadow-md">
                    <span className="font-handwritten text-xl sm:text-2xl text-[#fffeea] block font-bold leading-tight">
                      {reel.tagText}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-wide uppercase">
                      {reel.subTag}
                    </span>
                  </div>

                  {/* View Badge */}
                  <div className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    👁️ {reel.views}
                  </div>
                </div>

                {/* Product Info Strip & Add to Cart Button */}
                <div className="p-3 bg-white space-y-2">
                  <div
                    onClick={() => onSelectProduct(reel.product)}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <img
                      src={reel.product.images[0]}
                      alt={reel.product.name}
                      className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded border border-gray-200 shrink-0"
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

                  {(() => {
                    const isReelProdInCart = items.some((item) => item.product.id === reel.product.id);
                    return (
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
                        className="w-full py-2 bg-[#FBB6CE] hover:bg-[#F89CBA] text-[#1A1821] text-[11px] sm:text-xs font-black tracking-wider uppercase rounded transition-colors shadow-xs"
                      >
                        {isReelProdInCart ? 'Go to Cart' : 'Add to Cart'}
                      </button>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. VERIFIED CUSTOMER TESTIMONIALS & REVIEWS */}
      <TestimonialsSection
        products={productsList}
        onSelectProduct={onSelectProduct}
      />

      {/* 6. BRAND VALUE PROPOSITION STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 bg-white border border-[#EAE6DB] p-4 sm:p-6 text-center">
          {(homeConfig.valueProps && homeConfig.valueProps.length > 0 ? homeConfig.valueProps : [
            { id: '1', icon: 'ShieldCheck', title: '100% Anti-Tarnish', description: 'Real 18K Gold Vacuum Plating' },
            { id: '2', icon: 'Feather', title: 'Cloud-Soft Fabrics', description: 'Soft, airy & gentle on skin' },
            { id: '3', icon: 'Truck', title: 'Fast Pan-India Delivery', description: 'Express 24h dispatch' },
            { id: '4', icon: 'RotateCcw', title: 'Hassle-Free Exchange', description: '7-Day Easy Doorstep Exchange' },
          ]).map((rawVp) => {
            const isReturns = /return/i.test(rawVp.title);
            const vp = isReturns
              ? {
                  ...rawVp,
                  icon: 'RotateCcw',
                  title: 'Hassle-Free Exchange',
                  description: !/return/i.test(rawVp.description) ? rawVp.description : '7-Day Easy Doorstep Exchange',
                }
              : rawVp;

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
