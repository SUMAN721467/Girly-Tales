import React, { useState, useMemo, useEffect } from 'react';
import { Filter, SlidersHorizontal, X, ArrowUpDown } from 'lucide-react';
import { MOCK_PRODUCTS } from '../data/products';
import { Product, SortOption } from '../types/product';
import { ProductCard } from '../components/product/ProductCard';
import { DatabaseService, RealCategory } from '../lib/databaseService';

import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ShopPageProps {
  initialCategory?: string;
  onSelectProduct: (product: Product) => void;
  onQuickView?: (product: Product) => void;
}

const ALL_SUBCATEGORIES = [
  'Satin Sets',
  'Cotton Sets',
  'Robe Sets',
  'Loungewear',
  'Sleepshirts',
  'Rings',
  'Necklaces',
  'Earrings',
  'Bracelets',
  'Anklets',
];

export const ShopPage: React.FC<ShopPageProps> = ({
  initialCategory = 'all',
  onSelectProduct,
}) => {
  const [productsList, setProductsList] = useState<Product[]>(MOCK_PRODUCTS);
  const [dbCategories, setDbCategories] = useState<RealCategory[]>([]);
  const [category, setCategory] = useState<string>(initialCategory);
  const [selectedSubCats, setSelectedSubCats] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(4000);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  const loadStorefrontData = async () => {
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
    }
  };

  useEffect(() => {
    loadStorefrontData();

    // 1. Listen for global cross-component database sync events
    const handleDbSync = (e: any) => {
      const type = e.detail?.type;
      if (!type || type === 'categories' || type === 'products' || type === 'all') {
        loadStorefrontData();
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
            () => loadStorefrontData()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            () => loadStorefrontData()
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase realtime subscription note:', err);
      }
    }

    return () => {
      window.removeEventListener('gt_db_sync', handleDbSync);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return productsList.filter((product) => {
      if (category !== 'all') {
        const catLower = category.toLowerCase();
        const productCat = (product.category || '').toLowerCase();
        const productSub = (product.subCategory || '').toLowerCase();
        const matchMain = productCat === catLower;
        const matchSub = productSub.includes(catLower);
        if (!matchMain && !matchSub) return false;
      }
      if (selectedSubCats.length > 0 && !selectedSubCats.includes(product.subCategory)) return false;
      if (product.price > maxPrice) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'newest') return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
      return 0;
    });
  }, [productsList, category, selectedSubCats, maxPrice, sortBy]);

  const toggleSubCategory = (sub: string) => {
    setSelectedSubCats((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const clearAllFilters = () => {
    setCategory('all');
    setSelectedSubCats([]);
    setMaxPrice(4000);
    setSortBy('featured');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 bg-[#fffee3] w-full">
      {/* Category Header */}
      <div className="bg-white p-5 sm:p-8 border border-[#EAE6DB] text-center space-y-2">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#967BB6]">
          ✦ CURATED ESSENTIALS ✦
        </span>
        <h1 className="font-sans font-black text-xl sm:text-3xl md:text-4xl text-brand-charcoal uppercase">
          {category === 'nightwear'
            ? 'Nightwear & Sleepsuits'
            : category === 'jewellery'
            ? '18K Anti-Tarnish Jewellery'
            : category === 'all'
            ? 'All Collections'
            : category.toUpperCase()}
        </h1>
        <p className="text-xs sm:text-sm text-brand-muted max-w-lg mx-auto">
          {category === 'nightwear'
            ? 'Ultra-soft pure cotton and mulberry silk sets designed for sweet dreams and slow mornings.'
            : category === 'jewellery'
            ? 'Real 18K gold vacuum PVD plating over medical grade steel. 100% waterproof.'
            : 'Explore our complete range of night suits, pyjama sets, waterproof rings, and necklaces.'}
        </p>
      </div>

      {/* Filter & Sort Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE6DB]">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setCategory('all')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-[11px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
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
            const count = productsList.filter(
              (p) =>
                (p.category || '').toLowerCase() === cat.slug.toLowerCase() ||
                (p.category || '').toLowerCase() === cat.name.toLowerCase() ||
                (p.subCategory || '').toLowerCase().includes(cat.name.toLowerCase())
            ).length;

            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.slug || cat.name.toLowerCase())}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-[11px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  isCatSelected
                    ? 'bg-[#967BB6] text-white shadow-xs'
                    : 'bg-white text-brand-charcoal border border-[#EAE6DB] hover:bg-[#F5EEFA]'
                }`}
              >
                {cat.name} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>

        {/* Right Sort & Mobile Filter */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EAE6DB] text-[11px] sm:text-xs font-bold text-brand-charcoal"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-lavender" />
            <span>Filters</span>
          </button>

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

      {/* Main Grid with Sidebar Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Filter Sidebar for Laptop/Desktop */}
        <aside className="hidden lg:block lg:col-span-1 space-y-6 bg-white p-5 border border-[#EAE6DB] sticky top-24">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DB]">
            <h3 className="text-xs font-black uppercase tracking-wider text-brand-charcoal flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-brand-lavender" />
              <span>Filter By</span>
            </h3>
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-brand-lavender hover:underline font-bold"
            >
              Reset
            </button>
          </div>

          {/* Subcategories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal mb-2.5">
              Category Type
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {ALL_SUBCATEGORIES.map((sub) => (
                <label
                  key={sub}
                  className="flex items-center gap-2 text-xs text-brand-charcoal cursor-pointer hover:text-brand-lavender select-none"
                >
                  <input
                    type="checkbox"
                    checked={selectedSubCats.includes(sub)}
                    onChange={() => toggleSubCategory(sub)}
                    className="rounded text-brand-lavender focus:ring-brand-lavender"
                  />
                  <span>{sub}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <div className="flex justify-between text-xs font-bold text-brand-charcoal mb-2">
              <span className="uppercase tracking-wider">Max Price</span>
              <span className="text-brand-lavender font-black">₹{maxPrice}</span>
            </div>
            <input
              type="range"
              min="500"
              max="4000"
              step="100"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-brand-lavender cursor-pointer"
            />
          </div>
        </aside>

        {/* Product Listing Grid: 2 cols on mobile/tablet, 3 cols on desktop */}
        <div className="lg:col-span-3 space-y-4">
          <div className="text-xs font-bold text-brand-muted">
            Showing {filteredProducts.length} styles
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Filter Modal Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex modal-backdrop lg:hidden animate-fade-in" onClick={() => setIsMobileFilterOpen(false)}>
          <div
            className="w-4/5 max-w-xs bg-white h-full p-6 flex flex-col justify-between animate-slide-up relative overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DB]">
                <h3 className="font-sans font-black text-sm uppercase text-brand-charcoal">Filters</h3>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 rounded-full bg-[#fffee3] text-brand-charcoal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Subcategories */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-brand-charcoal">
                  Category
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {ALL_SUBCATEGORIES.map((sub) => (
                    <label key={sub} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedSubCats.includes(sub)}
                        onChange={() => toggleSubCategory(sub)}
                        className="rounded text-brand-lavender"
                      />
                      <span>{sub}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>Max Price:</span>
                  <span className="text-brand-lavender">₹{maxPrice}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="4000"
                  step="100"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-brand-lavender"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAE6DB] space-y-2">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full py-2.5 bg-[#967BB6] text-white text-xs font-bold uppercase tracking-wider rounded"
              >
                Apply Filters ({filteredProducts.length})
              </button>
              <button
                onClick={clearAllFilters}
                className="w-full py-2 bg-transparent text-xs font-bold text-brand-muted hover:text-brand-charcoal uppercase"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
