import React, { useState, useMemo, useEffect } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Product, SortOption } from '../types/product';
import { ProductCard } from '../components/product/ProductCard';
import { DatabaseService, RealCategory } from '../lib/databaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_PRODUCTS } from '../data/products';

interface ShopPageProps {
  initialCategory?: string;
  onSelectProduct: (product: Product) => void;
  onQuickView?: (product: Product) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  initialCategory = 'all',
  onSelectProduct,
}) => {
  const [productsList, setProductsList] = useState<Product[]>(() => DatabaseService.getCachedProducts());
  const [dbCategories, setDbCategories] = useState<RealCategory[]>(() => {
    const cached = DatabaseService.getCachedCategories();
    return cached.length > 0 ? cached.filter((c) => c.isActive) : [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => DatabaseService.getCachedProducts().length === 0);
  const [category, setCategory] = useState<string>(initialCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  const handleSelectCategory = (newCat: string) => {
    setCategory(newCat);
    setSelectedSubCategory(null);
  };

  const loadStorefrontData = async () => {
    if (!isSupabaseConfigured) {
      setProductsList(MOCK_PRODUCTS);
      setIsLoading(false);
      return;
    }

    try {
      const [loadedProducts, loadedCats] = await Promise.all([
        DatabaseService.getProducts(),
        DatabaseService.getCategories(),
      ]);
      if (Array.isArray(loadedProducts)) {
        setProductsList(loadedProducts);
      }
      if (Array.isArray(loadedCats)) {
        const activeCats = loadedCats.filter((c) => c.isActive);
        setDbCategories(activeCats);
        setCategory((currentCat) => {
          if (currentCat === 'all') return 'all';
          const exists = activeCats.some(
            (c) =>
              c.slug.toLowerCase() === currentCat.toLowerCase() ||
              c.name.toLowerCase() === currentCat.toLowerCase()
          );
          return exists ? currentCat : 'all';
        });
      }
    } catch (e) {
      console.warn('Storefront data load warning:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStorefrontData();

    // Debounce storefront reloading
    let debounceTimer: any = null;
    const debouncedLoad = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadStorefrontData();
      }, 350);
    };

    // 1. Listen for global cross-component database sync events
    const handleDbSync = (e: any) => {
      const type = e.detail?.type;
      if (!type || type === 'categories' || type === 'products' || type === 'all') {
        debouncedLoad();
      }
    };
    window.addEventListener('gt_db_sync', handleDbSync);

    // 2. Real-time Supabase Database Listener
    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel('storefront-realtime-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'categories' },
            () => debouncedLoad()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            () => debouncedLoad()
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase realtime subscription note:', err);
      }
    }

    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener('gt_db_sync', handleDbSync);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const currentSubCategories = useMemo(() => {
    const set = new Set<string>();

    if (category === 'all') {
      // Gather subcategories strictly from admin-configured active categories
      dbCategories.forEach((c) => {
        if (Array.isArray(c.subCategories)) {
          c.subCategories.forEach((s) => {
            const t = s.trim();
            if (t) set.add(t);
          });
        }
      });
    } else {
      const catLower = category.toLowerCase().trim();
      const matchedCat = dbCategories.find(
        (c) =>
          c.slug.toLowerCase() === catLower ||
          c.name.toLowerCase() === catLower
      );

      // Strictly use subcategories configured by admin on this category
      if (matchedCat?.subCategories && matchedCat.subCategories.length > 0) {
        matchedCat.subCategories.forEach((s) => {
          const t = s.trim();
          if (t) set.add(t);
        });
      }
    }

    return Array.from(set).filter(Boolean);
  }, [category, dbCategories]);

  const getSubCategoryCount = (sub: string) => {
    const s = sub.toLowerCase().trim();
    return productsList.filter((p) => {
      // 1. Must match main category if not 'all'
      if (category !== 'all') {
        const catLower = category.toLowerCase().trim();
        const productCat = (p.category || '').toLowerCase().trim();
        const productSub = (p.subCategory || '').toLowerCase().trim();
        const matchMain =
          productCat === catLower ||
          (catLower === 'nightwear' && (productCat === 'nightwear' || productSub.includes('set') || productSub.includes('pj'))) ||
          (catLower === 'jewellery' && (productCat === 'jewellery' || productCat === 'jewelry')) ||
          productSub.includes(catLower);
        if (!matchMain) return false;
      }

      // 2. Must match subcategory
      const pSub = (p.subCategory || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      if (s === 'padded') {
        return (
          (pSub.includes('padded') && !pSub.includes('non-padded') && !pSub.includes('non padded')) ||
          (pName.includes('padded') && !pName.includes('non-padded') && !pName.includes('non padded'))
        );
      }
      if (s === 'non-padded' || s === 'non padded') {
        return (
          pSub.includes('non-padded') ||
          pSub.includes('non padded') ||
          pName.includes('non-padded') ||
          pName.includes('non padded')
        );
      }
      return pSub.includes(s) || pName.includes(s);
    }).length;
  };

  const filteredProducts = useMemo(() => {
    return productsList.filter((product) => {
      if (category !== 'all') {
        const catLower = category.toLowerCase().trim();
        const productCat = (product.category || '').toLowerCase().trim();
        const productSub = (product.subCategory || '').toLowerCase().trim();
        const productName = (product.name || '').toLowerCase().trim();

        const matchMain =
          productCat === catLower ||
          (catLower === 'nightwear' &&
            (productCat === 'nightwear' ||
              productSub.includes('set') ||
              productSub.includes('pj') ||
              productSub.includes('satin') ||
              productSub.includes('cotton') ||
              productSub.includes('robe') ||
              productSub.includes('lounge') ||
              productSub.includes('sleep'))) ||
          (catLower === 'jewellery' &&
            (productCat === 'jewellery' ||
              productCat === 'jewelry' ||
              productSub.includes('ring') ||
              productSub.includes('necklace') ||
              productSub.includes('earring') ||
              productSub.includes('bracelet') ||
              productSub.includes('anklet') ||
              productSub.includes('gold') ||
              productSub.includes('jewel'))) ||
          (catLower === 'satin-sets' &&
            (productSub.includes('satin') || productName.includes('satin'))) ||
          (catLower === 'cotton-sets' &&
            (productSub.includes('cotton') || productName.includes('cotton'))) ||
          (catLower === 'jewels' &&
            (productCat === 'jewellery' ||
              productSub.includes('ring') ||
              productSub.includes('necklace') ||
              productSub.includes('earring') ||
              productSub.includes('bracelet')));

        const matchSub = productSub.includes(catLower) || catLower.includes(productSub);
        if (!matchMain && !matchSub) return false;
      }

      if (selectedSubCategory) {
        const productSub = (product.subCategory || '').toLowerCase();
        const productName = (product.name || '').toLowerCase();
        const s = selectedSubCategory.toLowerCase().trim();
        if (s === 'padded') {
          const isPadded =
            (productSub.includes('padded') && !productSub.includes('non-padded') && !productSub.includes('non padded')) ||
            (productName.includes('padded') && !productName.includes('non-padded') && !productName.includes('non padded'));
          if (!isPadded) return false;
        } else if (s === 'non-padded' || s === 'non padded') {
          const isNonPadded =
            productSub.includes('non-padded') ||
            productSub.includes('non padded') ||
            productName.includes('non-padded') ||
            productName.includes('non padded');
          if (!isNonPadded) return false;
        } else {
          if (!productSub.includes(s) && !productName.includes(s)) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'newest') return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
      return 0;
    });
  }, [productsList, category, selectedSubCategory, sortBy]);

  const clearAllFilters = () => {
    setCategory('all');
    setSelectedSubCategory(null);
    setSortBy('featured');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 bg-[#fffeea] w-full">
      {/* Category Header */}
      <div className="bg-white p-5 sm:p-8 border border-[#EAE6DB] text-center space-y-2">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#967BB6]">
          ✦ CURATED ESSENTIALS ✦
        </span>
        <h1 className="font-sans font-black text-xl sm:text-3xl md:text-4xl text-brand-charcoal uppercase">
          {category === 'nightwear'
            ? 'Nightwear & Sleepsuits'
            : category === 'jewellery'
            ? 'Anti-Tarnish Jewellery'
            : category === 'all'
            ? 'All Collections'
            : category.toUpperCase()}
        </h1>
        <p className="text-xs sm:text-sm text-brand-muted max-w-lg mx-auto">
          {category === 'nightwear'
            ? 'Ultra-soft pure cotton and mulberry silk sets designed for sweet dreams and slow mornings.'
            : category === 'jewellery'
            ? 'Anti-tarnish vacuum PVD plating over medical grade steel. 100% waterproof.'
            : 'Explore our complete range of night suits, pyjama sets, waterproof rings, and necklaces.'}
        </p>
      </div>

      {/* Filter & Sort Bar */}
      <div className="space-y-3 pb-3 border-b border-[#EAE6DB]">
        {/* Main Category Bar with Right Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => handleSelectCategory('all')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-[11px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                category === 'all'
                  ? 'bg-[#967BB6] text-white shadow-xs'
                  : 'bg-white text-brand-charcoal border border-[#EAE6DB] hover:bg-[#F5EEFA]'
              }`}
            >
              All ({productsList.length})
            </button>

            {dbCategories.map((cat) => {
              const isCatSelected =
                category.toLowerCase() === cat.slug.toLowerCase() ||
                category.toLowerCase() === cat.name.toLowerCase();
              const catSlugLower = cat.slug.toLowerCase();
              const catNameLower = cat.name.toLowerCase();
              const count = productsList.filter((p) => {
                const pCat = (p.category || '').toLowerCase();
                const pSub = (p.subCategory || '').toLowerCase();
                const pName = (p.name || '').toLowerCase();
                return (
                  pCat === catSlugLower ||
                  pCat === catNameLower ||
                  (catSlugLower === 'nightwear' &&
                    (pCat === 'nightwear' ||
                      pSub.includes('set') ||
                      pSub.includes('pj') ||
                      pSub.includes('satin') ||
                      pSub.includes('cotton') ||
                      pSub.includes('robe') ||
                      pSub.includes('lounge') ||
                      pSub.includes('sleep'))) ||
                  (catSlugLower === 'jewellery' &&
                    (pCat === 'jewellery' ||
                      pCat === 'jewelry' ||
                      pSub.includes('ring') ||
                      pSub.includes('necklace') ||
                      pSub.includes('earring') ||
                      pSub.includes('bracelet') ||
                      pSub.includes('gold') ||
                      pSub.includes('jewel'))) ||
                  (catSlugLower === 'satin-sets' &&
                    (pSub.includes('satin') || pName.includes('satin'))) ||
                  (catSlugLower === 'cotton-sets' &&
                    (pSub.includes('cotton') || pName.includes('cotton'))) ||
                  (catSlugLower === 'jewels' &&
                    (pCat === 'jewellery' ||
                      pSub.includes('ring') ||
                      pSub.includes('necklace') ||
                      pSub.includes('earring') ||
                      pSub.includes('bracelet'))) ||
                  pSub.includes(catNameLower)
                );
              }).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.slug || cat.name.toLowerCase())}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-[11px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    isCatSelected
                      ? 'bg-[#967BB6] text-white shadow-xs'
                      : 'bg-white text-brand-charcoal border border-[#EAE6DB] hover:bg-[#F5EEFA]'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Right Sort */}
          <div className="flex items-center justify-end gap-2.5">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-brand-muted hidden sm:inline font-bold">Sort:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-white border border-[#EAE6DB] px-3 py-1.5 text-[11px] sm:text-xs font-bold text-brand-charcoal focus:outline-none cursor-pointer pr-7 appearance-none"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">New Arrivals</option>
                </select>
                <ArrowUpDown className="w-3 h-3 text-brand-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* SUB-CATEGORY ROW (Under the main category) */}
        {currentSubCategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1 animate-fade-in">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-brand-muted shrink-0 flex items-center gap-1 pl-0.5">
              Sub-Category:
            </span>
            <button
              onClick={() => setSelectedSubCategory(null)}
              className={`px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                !selectedSubCategory
                  ? 'bg-brand-charcoal text-white shadow-xs'
                  : 'bg-white text-brand-muted border border-[#EAE6DB] hover:text-brand-charcoal hover:bg-[#FAF8F2]'
              }`}
            >
              All {category !== 'all' ? (dbCategories.find(c => c.slug.toLowerCase() === category.toLowerCase() || c.name.toLowerCase() === category.toLowerCase())?.name || category) : 'Styles'}
            </button>
            {currentSubCategories.map((sub) => {
              const isSelected = selectedSubCategory?.toLowerCase().trim() === sub.toLowerCase().trim();
              const count = getSubCategoryCount(sub);
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubCategory(isSelected ? null : sub)}
                  className={`px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#967BB6] text-white shadow-xs scale-[1.02]'
                      : 'bg-white text-brand-charcoal border border-[#EAE6DB] hover:border-[#967BB6] hover:bg-[#F5EEFA]'
                  }`}
                >
                  <span>{sub === 'Padded' ? '✨ Padded' : sub === 'Non-Padded' ? '🌿 Non-Padded' : sub}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-[#FAF8F2] text-brand-muted border border-[#EAE6DB]/60'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Listing Section */}
      <div className="space-y-4 w-full">
        <div className="flex items-center justify-between text-xs font-bold text-brand-muted">
          <span>
            Showing {filteredProducts.length} styles
            {selectedSubCategory && (
              <span className="text-brand-charcoal font-black ml-1.5">
                • {selectedSubCategory}
              </span>
            )}
          </span>
          {(category !== 'all' || selectedSubCategory) && (
            <button
              onClick={clearAllFilters}
              className="text-[#967BB6] hover:underline font-bold cursor-pointer"
            >
              Clear Filter{selectedSubCategory && category !== 'all' ? 's' : ''}
            </button>
          )}
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-white rounded-xl border border-[#EAE6DB] overflow-hidden animate-pulse">
                <div className="w-full aspect-[3/4] bg-[#FAF8F2] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[#967BB6]/30 border-t-[#967BB6] animate-spin" />
                </div>
                <div className="p-3.5 space-y-2.5">
                  <div className="h-3 bg-[#EAE6DB]/60 rounded w-1/3" />
                  <div className="h-4 bg-[#EAE6DB] rounded w-4/5" />
                  <div className="h-4 bg-[#EAE6DB]/70 rounded w-1/4 pt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 sm:p-12 text-center rounded-2xl border border-[#EAE6DB] space-y-4 max-w-md mx-auto my-6">
            <div className="w-14 h-14 rounded-full bg-[#FAF8F2] text-[#967BB6] flex items-center justify-center mx-auto text-2xl">
              ✨
            </div>
            <h3 className="font-serif text-xl font-bold text-brand-charcoal">
              No styles found
            </h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              We couldn't find any products matching your current filters. Try exploring all collections.
            </p>
            <button
              onClick={clearAllFilters}
              className="px-6 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Explore All Styles
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
