import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, TrendingUp } from 'lucide-react';
import { MOCK_PRODUCTS } from '../../data/products';
import { Product } from '../../types/product';
import { DatabaseService } from '../../lib/databaseService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

const TRENDING_TAGS = [
  'Satin Night Suit',
  'Anti-Tarnish Ring',
  'Waterproof Necklace',
  'Cloud Romper',
  'Teardrop Earrings',
  'Cotton PJ Set',
  'Evil Eye Anklet'
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState('');
  const [productsList, setProductsList] = useState<Product[]>(MOCK_PRODUCTS);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadProducts = async () => {
    try {
      const prods = await DatabaseService.getProducts();
      if (Array.isArray(prods) && prods.length > 0) {
        setProductsList(prods);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const results = query.trim()
    ? productsList.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.subCategory.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      })
    : [];

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 modal-backdrop animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative max-h-[80vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-brand-border pb-4">
          <Search className="w-5 h-5 text-brand-lilac shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search night suits, waterproof rings, necklaces..."
            className="w-full bg-transparent px-3 text-base sm:text-lg text-brand-charcoal placeholder-brand-muted/70 focus:outline-none font-medium"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-brand-muted hover:text-brand-charcoal"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-brand-ivory text-brand-charcoal hover:bg-brand-lilac-subtle"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Trending Suggestions when query is empty */}
        {!query && (
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-brand-lilac" />
              <span>Trending Searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setQuery(tag)}
                  className="px-3.5 py-1.5 bg-brand-ivory hover:bg-brand-lilac-subtle border border-brand-border hover:border-brand-lilac rounded-full text-xs text-brand-charcoal font-medium transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Curated Quick Picks */}
            <div className="pt-4 border-t border-brand-border">
              <span className="text-xs font-bold text-brand-charcoal block mb-3">
                🔥 Bestselling Essentials
              </span>
              <div className="grid grid-cols-2 gap-3">
                {MOCK_PRODUCTS.slice(0, 2).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-brand-border hover:border-brand-lilac bg-brand-ivory/50 cursor-pointer transition-all"
                  >
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-brand-charcoal truncate">{p.name}</p>
                      <p className="text-xs font-bold text-brand-lilac">₹{p.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Results List */}
        {query && (
          <div className="flex-1 overflow-y-auto py-4 space-y-2 divide-y divide-brand-border/60">
            {results.length === 0 ? (
              <div className="py-12 text-center text-brand-muted">
                <p className="text-sm">No styles found matching "{query}"</p>
                <p className="text-xs mt-1">Try searching for "silk", "gold", "earrings", or "cotton".</p>
              </div>
            ) : (
              results.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-brand-ivory cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-14 h-16 rounded-lg object-cover border border-brand-border shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-brand-lilac">
                        {product.category}
                      </span>
                      <h4 className="text-xs sm:text-sm font-medium text-brand-charcoal truncate group-hover:text-brand-lilac transition-colors">
                        {product.name}
                      </h4>
                      <p className="text-xs font-bold text-brand-charcoal mt-0.5">
                        ₹{product.price.toLocaleString('en-IN')}
                        {product.originalPrice > product.price && (
                          <span className="ml-1.5 text-[10px] text-brand-muted-light line-through font-normal">
                            ₹{product.originalPrice}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-brand-muted-light group-hover:text-brand-lilac group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
