import React from 'react';
import { Product } from '../../types/product';
import { ProductCard } from './ProductCard';
import { Frown } from 'lucide-react';
import { Button } from '../common/Button';

interface ProductGridProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  onResetFilters?: () => void;
  isLoading?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onSelectProduct,
  onQuickView,
  onResetFilters,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <div
            key={n}
            className="bg-white rounded-3xl p-4 border border-brand-border space-y-3"
          >
            <div className="aspect-[4/5] rounded-2xl skeleton-shimmer"></div>
            <div className="h-4 w-3/4 rounded skeleton-shimmer"></div>
            <div className="h-3 w-1/2 rounded skeleton-shimmer"></div>
            <div className="h-8 rounded-full skeleton-shimmer"></div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-16 px-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-brand-lilac-subtle text-brand-lilac flex items-center justify-center mx-auto mb-4">
          <Frown className="w-8 h-8" />
        </div>
        <h3 className="font-serif text-2xl text-brand-charcoal font-medium mb-2">
          No matching styles found
        </h3>
        <p className="text-xs sm:text-sm text-brand-muted mb-6 leading-relaxed">
          We couldn't find any products matching your selected filters. Try broadening your criteria or reset filters.
        </p>
        {onResetFilters && (
          <Button variant="primary" onClick={onResetFilters} size="sm">
            Clear All Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelectProduct={onSelectProduct}
          onQuickView={onQuickView}
        />
      ))}
    </div>
  );
};
