import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import { Product } from '../../types/product';
import { DatabaseService, HomepageConfig } from '../../lib/databaseService';

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
  homeConfig?: HomepageConfig;
}

const CURATED_REVIEWS: TestimonialItem[] = [
  {
    id: 'cr-1',
    author: 'Ananya S.',
    location: 'Mumbai',
    rating: 5,
    comment: 'Wore my necklace daily to the gym and in hot showers for 3 months — still 100% shiny gold with zero tarnish!',
    productName: '18K Gold Clover Necklace',
  },
  {
    id: 'cr-2',
    author: 'Priya M.',
    location: 'Kolkata',
    rating: 5,
    comment: 'The softest pure cotton nightwear I have ever worn. Breathable, airy, and the floral ruffle trim is so aesthetic.',
    productName: 'Fine Blue Ruffle Nightsuit',
  },
  {
    id: 'cr-3',
    author: 'Rhea S.',
    location: 'Bengaluru',
    rating: 5,
    comment: 'Luxury boutique unboxing with velvet pouch. Arrived in 2 days and looks just like solid luxury gold jewellery.',
    productName: 'Anti-Tarnish Tennis Bracelet',
  },
  {
    id: 'cr-4',
    author: 'Tanvi K.',
    location: 'Delhi NCR',
    rating: 5,
    comment: 'Obsessed with the mulberry silk robe set. The fit is elegant, silky smooth, and feels truly opulent.',
    productName: 'Mulberry Silk Satin Robe Set',
  },
  {
    id: 'cr-5',
    author: 'Sneha R.',
    location: 'Pune',
    rating: 5,
    comment: 'Wash after wash, the fabric remains cloud-soft and color has not faded even a bit. Girly Tales is my go-to!',
    productName: 'Pink Bow & Heart Cotton PJ',
  },
  {
    id: 'cr-6',
    author: 'Ishita P.',
    location: 'Jaipur',
    rating: 5,
    comment: 'Finally jewellery that doesn’t turn my sensitive skin green! 100% waterproof and sweatproof gold.',
    productName: 'Waterproof Chunky Gold Hoops',
  },
  {
    id: 'cr-7',
    author: 'Meera N.',
    location: 'Hyderabad',
    rating: 5,
    comment: 'Ordered the Hello Kitty set for my sister and myself. The cutest matching PJs and premium stitching!',
    productName: 'Hello Kitty Nightsuit',
  },
  {
    id: 'cr-8',
    author: 'Kavya D.',
    location: 'Chandigarh',
    rating: 5,
    comment: 'Super fast pan-India delivery and packaging was adorable. Perfect gift for birthdays and bridesmaid hampers!',
    productName: 'Dainty Pearl Charm Anklet',
  },
];

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  products = [],
  onSelectProduct,
  homeConfig,
}) => {
  const sectionTitle = homeConfig?.reviewsTitle || 'WHAT OUR CUSTOMERS SAY';
  const ratingText = homeConfig?.reviewsRatingText || '4.9 / 5.0';
  const subtitle = homeConfig?.reviewsSubtitle || 'Over 3,800+ happy buyers across India';

  const [dbReviews, setDbReviews] = useState<TestimonialItem[]>(() => {
    const initial = DatabaseService.getCachedTestimonials();
    const approved = initial.filter((r) => r.status === 'Approved' || r.status === 'Featured');
    return approved.map((r) => ({
      id: r.id,
      author: r.author || 'Verified Customer',
      location: r.location || 'Verified Buyer',
      rating: r.rating || 5,
      comment: r.comment,
      productName: r.productName || 'Anti-Tarnish Jewellery',
    }));
  });

  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadAndSetReviews = () => {
    DatabaseService.getTestimonials()
      .then((items) => {
        if (Array.isArray(items)) {
          const approved = items.filter((r) => r.status === 'Approved' || r.status === 'Featured');
          const mapped: TestimonialItem[] = approved.map((r) => ({
            id: r.id,
            author: r.author || 'Verified Customer',
            location: r.location || 'Verified Buyer',
            rating: r.rating || 5,
            comment: r.comment,
            productName: r.productName || 'Anti-Tarnish Jewellery',
          }));
          setDbReviews(mapped);
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

  // Merge database reviews with curated reviews so there is always a rich list to scroll smoothly
  const mergedReviews = useMemo(() => {
    const list: TestimonialItem[] = [...dbReviews];
    CURATED_REVIEWS.forEach((c) => {
      if (!list.some((d) => d.author.toLowerCase() === c.author.toLowerCase() || d.comment === c.comment)) {
        list.push(c);
      }
    });
    return list;
  }, [dbReviews]);

  // Duplicate items for a continuous, seamless infinite loop
  const duplicatedReviews = useMemo(() => {
    if (mergedReviews.length === 0) return [];
    return [...mergedReviews, ...mergedReviews];
  }, [mergedReviews]);

  // Buttery-smooth automatic horizontal scrolling using requestAnimationFrame
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || duplicatedReviews.length === 0) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const speed = 35; // Pixels per second for a smooth, relaxed reading speed

    const step = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1); // Clamp delta to avoid jump on tab switch
      lastTime = now;

      if (!isPaused && container) {
        container.scrollLeft += speed * delta;
        const halfWidth = container.scrollWidth / 2;
        if (container.scrollLeft >= halfWidth) {
          container.scrollLeft -= halfWidth;
        }
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, duplicatedReviews.length]);

  if (!mergedReviews || mergedReviews.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-16">
      {/* Centered Clean Header */}
      <div className="text-center mb-6 sm:mb-8 space-y-1">
        <h2 className="font-sans font-black text-xl sm:text-2xl md:text-3xl text-brand-charcoal uppercase tracking-tight">
          {sectionTitle}
        </h2>
        <div className="flex items-center justify-center gap-1.5 text-xs text-brand-muted">
          <div className="flex text-amber-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="font-bold text-brand-charcoal">{ratingText}</span>
          <span>•</span>
          <span>{subtitle}</span>
        </div>
      </div>

      {/* Auto-scrolling Rail with Gradient Edge Masks */}
      <div className="relative -mx-4 sm:mx-0">
        {/* Left Fade Gradient Mask */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-[#fffeea] to-transparent z-10" />

        {/* Right Fade Gradient Mask */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-[#fffeea] to-transparent z-10" />

        {/* Scrolling Track */}
        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => {
            setTimeout(() => setIsPaused(false), 1500);
          }}
          className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-2 px-4 sm:px-6 select-none cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {duplicatedReviews.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="w-[280px] min-w-[280px] sm:w-[320px] sm:min-w-[320px] shrink-0 bg-white border border-[#EAE6DB] hover:border-[#967BB6] rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-left space-y-3"
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
                        (p) =>
                          p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
                          item.productName.toLowerCase().includes(p.name.toLowerCase())
                      );
                      if (match) onSelectProduct(match);
                    }
                  }}
                  className={`text-[10px] text-[#967BB6] font-semibold truncate ${
                    onSelectProduct ? 'hover:underline cursor-pointer' : ''
                  }`}
                >
                  ✦ {item.productName}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
