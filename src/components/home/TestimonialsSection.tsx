import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import { Product } from '../../types/product';
import { DatabaseService, RealTestimonial } from '../../lib/databaseService';

interface TestimonialItem {
  id: string;
  author: string;
  location: string;
  rating: number;
  comment: string;
  productName: string;
}



interface TestimonialsSectionProps {
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  products = [],
  onSelectProduct
}) => {
  const [reviewsList, setReviewsList] = useState<TestimonialItem[]>(() => {
    const initialTestimonials = DatabaseService.getCachedTestimonials();
    const approved = initialTestimonials.filter((r) => r.status === 'Approved' || r.status === 'Featured');
    return approved.slice(0, 4).map((r) => ({
      id: r.id,
      author: r.author || 'Verified Customer',
      location: r.location || 'Verified Buyer',
      rating: r.rating || 5,
      comment: r.comment,
      productName: r.productName || '18K Anti-Tarnish Jewels',
    }));
  });

  const loadAndSetReviews = () => {
    DatabaseService.getTestimonials()
      .then((items) => {
        if (Array.isArray(items)) {
          const approved = items.filter((r) => r.status === 'Approved' || r.status === 'Featured');
          const mapped: TestimonialItem[] = approved.slice(0, 4).map((r) => ({
            id: r.id,
            author: r.author || 'Verified Customer',
            location: r.location || 'Verified Buyer',
            rating: r.rating || 5,
            comment: r.comment,
            productName: r.productName || '18K Anti-Tarnish Jewels',
          }));
          setReviewsList(mapped);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadAndSetReviews();

    const handleSync = (e: any) => {
      if (!e.detail?.type || e.detail?.type === 'testimonials' || e.detail?.type === 'reviews' || e.detail?.type === 'all') {
        loadAndSetReviews();
      }
    };

    window.addEventListener('gt_db_sync', handleSync);
    return () => {
      window.removeEventListener('gt_db_sync', handleSync);
    };
  }, []);

  if (!reviewsList || reviewsList.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-16">
      {/* Centered Small Header */}
      <div className="text-center mb-6 sm:mb-8 space-y-1">
        <h2 className="font-sans font-black text-xl sm:text-2xl md:text-3xl text-brand-charcoal uppercase tracking-tight">
          What Our Customers Say
        </h2>
        <div className="flex items-center justify-center gap-1.5 text-xs text-brand-muted">
          <div className="flex text-amber-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="font-bold text-brand-charcoal">4.9 / 5.0</span>
          <span>•</span>
          <span>Over 3,800+ happy buyers across India</span>
        </div>
      </div>

      {/* 4 Compact Cards - Horizontal Scroll on Mobile, Grid on Tablet/Desktop */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6 overflow-x-auto sm:overflow-visible scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-3 sm:pb-0">
        {reviewsList.map((item) => (
          <div
            key={item.id}
            className="w-[280px] min-w-[280px] sm:w-auto sm:min-w-0 snap-start shrink-0 sm:shrink bg-white border border-[#EAE6DB] hover:border-[#967BB6] rounded-2xl p-4 sm:p-5 shadow-xs transition-colors flex flex-col justify-between text-left space-y-3"
          >
            {/* Stars & Verified Pill */}
            <div className="flex items-center justify-between">
              <div className="flex gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3 h-3 ${
                      s <= item.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                <span>Verified</span>
              </span>
            </div>

            {/* Comment Quote */}
            <p className="text-xs text-brand-charcoal leading-relaxed line-clamp-3">
              "{item.comment}"
            </p>

            {/* Author & Item */}
            <div className="pt-2 border-t border-[#FAF8F2] space-y-0.5">
              <p className="text-xs font-bold text-brand-charcoal">
                {item.author} <span className="font-normal text-brand-muted text-[11px]">({item.location})</span>
              </p>
              <p
                onClick={() => {
                  if (onSelectProduct && products.length > 0) {
                    const match = products.find(
                      (p) => p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
                             item.productName.toLowerCase().includes(p.name.toLowerCase())
                    );
                    if (match) onSelectProduct(match);
                  }
                }}
                className={`text-[10px] text-[#967BB6] font-semibold truncate ${onSelectProduct ? 'hover:underline cursor-pointer' : ''}`}
              >
                ✦ {item.productName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
