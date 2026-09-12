import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import slide1 from '../../assets/slide1.jpg';
import slide2 from '../../assets/slide2.jpg';

export interface CategoryItem {
  id: string;
  name: string;
  tagline: string;
  image: string;
  category: string;
  ctaText?: string;
}

interface CategorySliderProps {
  categories?: CategoryItem[];
  onNavigate: (page: string, category?: string) => void;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat-nightwear',
    name: 'LUXURY NIGHTWEAR',
    tagline: 'Cloud-Soft Cotton & Mulberry Silk Sets',
    image: slide1,
    category: 'nightwear',
    ctaText: 'SHOP NIGHTWEAR'
  },
  {
    id: 'cat-jewellery',
    name: '18K ANTI-TARNISH JEWELS',
    tagline: 'Waterproof, Shower-Safe & Hypoallergenic',
    image: slide2,
    category: 'jewellery',
    ctaText: 'SHOP JEWELLERY'
  },
  {
    id: 'cat-party',
    name: 'PARTY & OCCASION',
    tagline: 'Statement Layered Chains & Sparkling Huggies',
    image: slide1,
    category: 'jewellery',
    ctaText: 'EXPLORE PARTY'
  },
  {
    id: 'cat-wedding',
    name: 'WEDDING & FESTIVE',
    tagline: 'Bridal Glow & Fine Occasion Wear',
    image: slide2,
    category: 'jewellery',
    ctaText: 'SHOP FESTIVE'
  },
  {
    id: 'cat-daily',
    name: 'DAILY ESSENTIALS',
    tagline: 'Everyday Sleep Shirts & Minimalist Rings',
    image: slide1,
    category: 'nightwear',
    ctaText: 'SHOP ESSENTIALS'
  }
];


export const CategorySlider: React.FC<CategorySliderProps> = ({
  categories = DEFAULT_CATEGORIES,
  onNavigate,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const total = categories.length;

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (index: number) => {
    setActiveIndex(index);
  };

  // Auto-slide every 2 seconds (paused on hover)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 2000);
    return () => clearInterval(interval);
  }, [nextSlide, isPaused]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 45) {
      nextSlide();
    } else if (diff < -45) {
      prevSlide();
    }
    touchStartX.current = null;
  };

  /**
   * Computes position offset relative to activeIndex in range [-2, -1, 0, 1, 2]
   */
  const getOffset = (index: number) => {
    let diff = index - activeIndex;
    while (diff > total / 2) diff -= total;
    while (diff <= -total / 2) diff += total;
    return diff;
  };

  return (
    <section
      className="w-full pt-0 pb-2 sm:pb-3 select-none bg-transparent overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Section Header */}
      <div className="text-center mb-2 sm:mb-3 space-y-0.5 px-4">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-[#967BB6]">
          THE ESSENTIALS
        </span>
        <h2 className="font-sans font-black text-xl sm:text-2xl md:text-3xl text-brand-charcoal uppercase tracking-tight">
          SHOP BY CATEGORY
        </h2>
      </div>

      {/* 100% Full-Screen Edge-to-Edge Carousel Frame occupying both sides */}
      <div
        className="relative w-full px-0 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation Arrow - Left */}
        <button
          onClick={prevSlide}
          className="absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-40 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white text-brand-charcoal flex items-center justify-center shadow-xl border border-gray-100 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer group"
          aria-label="Previous Category Slide"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-brand-charcoal group-hover:text-[#967BB6] transition-colors" />
        </button>

        {/* Navigation Arrow - Right */}
        <button
          onClick={nextSlide}
          className="absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-40 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white text-brand-charcoal flex items-center justify-center shadow-xl border border-gray-100 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer group"
          aria-label="Next Category Slide"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-brand-charcoal group-hover:text-[#967BB6] transition-colors" />
        </button>

        {/* Sleek 3D Overlapping Stack Carousel Stage (Fitted Snugly to Card Ratio) */}
        <div className="relative w-full h-[350px] sm:h-[370px] md:h-[350px] lg:h-[380px] xl:h-[450px] 2xl:h-[470px] flex items-center justify-center overflow-visible">
          {categories.map((item, idx) => {
            const offset = getOffset(idx);
            const isCenter = offset === 0;
            const isPrev = offset === -1;
            const isNext = offset === 1;
            const isFarPrev = offset === -2;
            const isFarNext = offset === 2;

            let transformStyles = '';
            let zIndex = 0;
            let opacity = 0;
            let pointerEvents: 'auto' | 'none' = 'none';

            if (isCenter) {
              // Prominent Active Center Card (on top of stack)
              transformStyles = 'translate3d(0%, 0, 0) scale(1)';
              zIndex = 30;
              opacity = 1;
              pointerEvents = 'auto';
            } else if (isPrev) {
              // Left Card
              transformStyles = 'translate3d(-78%, 0, 0) scale(0.92)';
              zIndex = 20;
              opacity = 0.88;
              pointerEvents = 'auto';
            } else if (isNext) {
              // Right Card
              transformStyles = 'translate3d(78%, 0, 0) scale(0.92)';
              zIndex = 20;
              opacity = 0.88;
              pointerEvents = 'auto';
            } else if (isFarPrev) {
              // Far Left Card (Fully occupying the left edge of the screen)
              transformStyles = 'translate3d(-154%, 0, 0) scale(0.84)';
              zIndex = 10;
              opacity = 0.74;
              pointerEvents = 'auto';
            } else if (isFarNext) {
              // Far Right Card (Fully occupying the right edge of the screen)
              transformStyles = 'translate3d(154%, 0, 0) scale(0.84)';
              zIndex = 10;
              opacity = 0.74;
              pointerEvents = 'auto';
            } else {
              // Hidden Wrap
              transformStyles = `translate3d(${offset > 0 ? 220 : -220}%, 0, 0) scale(0.65)`;
              zIndex = 5;
              opacity = 0;
              pointerEvents = 'none';
            }

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isCenter) {
                    onNavigate('shop', item.category);
                  } else {
                    goToSlide(idx);
                  }
                }}
                className={`absolute w-[70vw] sm:w-[42vw] md:w-[32vw] lg:w-[26vw] xl:w-[24vw] max-w-[360px] aspect-[4/5] rounded-xl overflow-hidden cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] origin-center ${
                  isCenter ? 'shadow-2xl ring-1 ring-black/10' : 'shadow-xl'
                }`}
                style={{
                  transform: transformStyles,
                  zIndex,
                  opacity,
                  pointerEvents,
                }}
              >
                {/* Background Photo (512x640 / 4:5 ratio) */}
                <img
                  src={item.image}
                  alt={item.name}
                  className={`w-full h-full object-cover object-center transition-transform duration-1000 ease-out ${
                    isCenter ? 'group-hover:scale-105' : 'filter brightness-95'
                  }`}
                  loading="lazy"
                />

                {/* Subtle Contrast Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none"></div>

                {/* Category Details & CTA Overlay */}
                <div
                  className={`absolute inset-x-3 sm:inset-x-5 bottom-4 sm:bottom-7 flex flex-col items-center text-center z-20 transition-all duration-500 ${
                    isCenter ? 'opacity-100 translate-y-0' : 'opacity-85 translate-y-1'
                  }`}
                >
                  {/* Category Name */}
                  <h3 className="font-sans font-black text-sm sm:text-base md:text-xl text-white uppercase tracking-[0.16em] pb-1 border-b-[1.5px] border-white drop-shadow-md">
                    {item.name}
                  </h3>

                  {/* Subtitle / Tagline */}
                  <p className="text-[10px] sm:text-xs md:text-sm text-[#fffee3] font-medium tracking-wide mt-1.5 drop-shadow line-clamp-1 max-w-[92%]">
                    {item.tagline}
                  </p>

                  {/* Sleek CTA Button (Active Center Only) */}
                  {isCenter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('shop', item.category);
                      }}
                      className="mt-2.5 sm:mt-3.5 bg-[#FBB6CE] hover:bg-[#F89CBA] text-brand-charcoal px-4 sm:px-6 py-1.5 sm:py-2 rounded text-[11px] sm:text-xs font-black tracking-widest uppercase transition-all duration-200 shadow-md hover:scale-105 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{item.ctaText || 'SHOP NOW'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Small Pagination Indicator Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-2.5 sm:mt-3.5">
          {categories.map((_, dotIdx) => {
            const isActive = dotIdx === activeIndex;
            return (
              <button
                key={dotIdx}
                onClick={() => goToSlide(dotIdx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isActive
                    ? 'w-6 h-1.5 bg-[#967BB6]'
                    : 'w-1.5 h-1.5 bg-[#D1CAD9] hover:bg-[#967BB6]/60'
                }`}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};




