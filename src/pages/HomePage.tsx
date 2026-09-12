import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../types/product';
import { ProductCard } from '../components/product/ProductCard';
import { BannerCarousel } from '../components/home/BannerCarousel';
import { ComfortMarquee } from '../components/home/ComfortMarquee';
import { CategorySlider } from '../components/home/CategorySlider';
import { useCart } from '../context/CartContext';
import { DatabaseService } from '../lib/databaseService';

interface HomePageProps {
  onNavigate: (page: string, category?: string) => void;
  onSelectProduct: (product: Product) => void;
  onQuickView: (product: Product) => void;
}

const REEL_CONFIGS = [
  {
    id: 'inf-1',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
    tagText: 'Cute & comfy',
    subTag: "PJ's ft. Girly Tales",
    views: '8.4k'
  },
  {
    id: 'inf-2',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
    tagText: 'Pinteresty',
    subTag: '18K Jewels ✨',
    views: '12.1k'
  },
  {
    id: 'inf-3',
    image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80',
    tagText: 'Cloud-soft',
    subTag: 'Cotton Pyjamas',
    views: '6.5k'
  },
  {
    id: 'inf-4',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80',
    tagText: '100% Waterproof',
    subTag: 'Never Green Skin 💧',
    views: '15.2k'
  }
];

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectProduct,
}) => {
  const { items, addToCart, openCart } = useCart();
  const [productsList, setProductsList] = useState<Product[]>([]);

  const loadHomeProducts = async () => {
    try {
      const prods = await DatabaseService.getProducts();
      if (Array.isArray(prods)) {
        setProductsList(prods);
      }
    } catch (e) {
      console.warn('Failed to load home products:', e);
    }
  };

  useEffect(() => {
    loadHomeProducts();

    const handleSync = (e: any) => {
      const type = e.detail?.type;
      if (!type || type === 'products' || type === 'all') {
        loadHomeProducts();
      }
    };

    window.addEventListener('gt_db_sync', handleSync);
    return () => window.removeEventListener('gt_db_sync', handleSync);
  }, []);

  const influencerReels = useMemo(() => {
    if (!productsList || productsList.length === 0) return [];
    return REEL_CONFIGS.map((cfg, idx) => {
      const prod = productsList[idx % productsList.length];
      return {
        ...cfg,
        product: prod,
      };
    }).filter(r => !!r.product);
  }, [productsList]);

  const trendingProducts = useMemo(() => {
    return productsList.filter((p) => p.inStock !== false).slice(0, 4);
  }, [productsList]);

  return (
    <div className="pb-16 bg-[#fffeea] w-full">
      {/* 1. FULL-WIDTH HERO CAROUSEL BANNER */}
      <section className="w-full">
        <BannerCarousel onNavigate={onNavigate} />
      </section>

      {/* 2. CONTINUOUS TICKER MARQUEE RIBBON */}
      <ComfortMarquee />

      {/* 3. THE ESSENTIALS - SHOP BY CATEGORY (PALMONAS CAROUSEL STYLE) */}
      <section className="w-full mt-3 sm:mt-5">
        <CategorySlider onNavigate={onNavigate} />
      </section>

      {/* 3. TRENDING THIS SEASON (1 ROW - 4 ITEMS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12">
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <h2 className="font-sans font-black text-lg sm:text-2xl md:text-3xl text-brand-charcoal uppercase tracking-tight">
            TRENDING THIS SEASON
          </h2>

          <button
            onClick={() => onNavigate('shop')}
            className="bg-[#FBB6CE] hover:bg-[#F89CBA] text-[#1A1821] px-3.5 sm:px-6 py-2 rounded text-[11px] sm:text-xs font-black tracking-wider uppercase transition-all shadow-xs shrink-0"
          >
            SHOP ALL TRENDING
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
              Influencer-Approved Comfort
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted">
              Discover how influencers style our nightwear &amp; jewellery and shop their curated picks.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
            {influencerReels.map((reel) => (
              <div
                key={reel.id}
                className="bg-white border border-[#EAE6DB] rounded-xl overflow-hidden flex flex-col justify-between shadow-xs"
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

      {/* 5. BRAND VALUE PROPOSITION STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 bg-white border border-[#EAE6DB] p-4 sm:p-6 text-center">
          <div className="space-y-1 p-2">
            <span className="text-xl sm:text-2xl">✨</span>
            <h4 className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-brand-charcoal">
              100% Anti-Tarnish
            </h4>
            <p className="text-[10px] sm:text-[11px] text-brand-muted">Real 18K Gold Vacuum Plating</p>
          </div>

          <div className="space-y-1 p-2">
            <span className="text-xl sm:text-2xl">🌿</span>
            <h4 className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-brand-charcoal">
              Pure Breathable Cotton
            </h4>
            <p className="text-[10px] sm:text-[11px] text-brand-muted">Soft, airy &amp; gentle on skin</p>
          </div>

          <div className="space-y-1 p-2">
            <span className="text-xl sm:text-2xl">📦</span>
            <h4 className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-brand-charcoal">
              Fast Pan-India Delivery
            </h4>
            <p className="text-[10px] sm:text-[11px] text-brand-muted">Express 24h dispatch</p>
          </div>

          <div className="space-y-1 p-2">
            <span className="text-xl sm:text-2xl">💕</span>
            <h4 className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-brand-charcoal">
              Designed For Her
            </h4>
            <p className="text-[10px] sm:text-[11px] text-brand-muted">Effortless everyday fit</p>
          </div>
        </div>
      </section>
    </div>
  );
};
