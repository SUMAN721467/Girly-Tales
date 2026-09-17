import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { HomeBanner } from '../../lib/databaseService';

import banner1 from '../../assets/banner1.png';
import banner2 from '../../assets/banner2.png';
import banner3 from '../../assets/banner3.png';

interface BannerCarouselProps {
  banners?: HomeBanner[];
  autoplaySeconds?: number;
  onNavigate: (page: string, category?: string) => void;
}

const DEFAULT_BANNERS: HomeBanner[] = [
  {
    id: 'b1',
    image: banner1,
    alt: 'Girly Tales Launch Offer',
    category: 'all',
    active: true,
    orderIndex: 0,
  },
  {
    id: 'b2',
    image: banner2,
    alt: 'Girly Tales Nightwear & Jewellery Collection',
    category: 'nightwear',
    active: true,
    orderIndex: 1,
  },
  {
    id: 'b3',
    image: banner3,
    alt: 'Girly Tales Anti-Tarnish Jewellery',
    category: 'jewellery',
    active: true,
    orderIndex: 2,
  },
];

export const BannerCarousel: React.FC<BannerCarouselProps> = ({
  banners,
  autoplaySeconds = 3,
  onNavigate,
}) => {
  const activeBanners = React.useMemo(() => {
    if (Array.isArray(banners) && banners.length > 0) {
      const filtered = banners.filter((b) => b.active !== false && (b.image || b.mobileImage));
      if (filtered.length > 0) return filtered;
    }
    return DEFAULT_BANNERS;
  }, [banners]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Auto-slide
  useEffect(() => {
    if (isPaused || activeBanners.length <= 1) return;
    const ms = Math.max(1000, (autoplaySeconds || 3) * 1000);
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, ms);
    return () => clearInterval(interval);
  }, [isPaused, activeBanners.length, autoplaySeconds]);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 40) {
      handleNext();
    } else if (diff < -40) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];
  const currentDefaultFallback = DEFAULT_BANNERS[currentIndex % DEFAULT_BANNERS.length]?.image || banner1;
  const currentDesktopImg = currentBanner.image || currentDefaultFallback;
  const currentMobileImg = currentBanner.mobileImage || currentBanner.image || currentDefaultFallback;

  return (
    <div
      className="relative w-full overflow-hidden select-none group bg-[#FEFDEB]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Clickable banner container with explicit 1600*650 for laptop and 414*650 for mobile */}
      <div
        onClick={() => {
          if (!currentBanner) return;
          if (currentBanner.category?.startsWith('http')) {
            window.open(currentBanner.category, '_blank');
          } else {
            onNavigate('shop', currentBanner.category === 'all' ? undefined : currentBanner.category);
          }
        }}
        className="relative w-full cursor-pointer select-none aspect-[414/650] md:aspect-[1600/650] overflow-hidden"
      >
        {/* Carousel Slides */}
        {activeBanners.map((banner, index) => {
          const defaultFallback = DEFAULT_BANNERS[index % DEFAULT_BANNERS.length]?.image || banner1;
          const laptopImg = banner.image || defaultFallback;
          const mobileImg = banner.mobileImage || banner.image || defaultFallback;

          return (
            <div
              key={banner.id || index}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out overflow-hidden ${
                index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* 1. MOBILE VIEW (< 768px): Dedicated Mobile Portrait Image */}
              <div className="block md:hidden w-full h-full overflow-hidden">
                <img
                  src={mobileImg}
                  alt={banner.alt || 'Girly Tales Mobile'}
                  className="w-full h-full object-cover object-center"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>

              {/* 2. LAPTOP / DESKTOP VIEW (>= 768px): Dedicated Laptop Landscape Image */}
              <div className="hidden md:block w-full h-full overflow-hidden">
                <img
                  src={laptopImg}
                  alt={banner.alt || 'Girly Tales Laptop'}
                  className="w-full h-full object-cover object-center"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>
            </div>
          );
        })}

        {/* Previous Arrow (Matching reference screenshot: circular with thin arrow) */}
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/70 hover:bg-white text-brand-charcoal flex items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer backdrop-blur-xs"
          aria-label="Previous Slide"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" />
        </button>

        {/* Next Arrow (Matching reference screenshot: circular with thin arrow) */}
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/70 hover:bg-white text-brand-charcoal flex items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer backdrop-blur-xs"
          aria-label="Next Slide"
        >
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" />
        </button>

        {/* Slide Indicators / Dots (Matching reference screenshot: elongated active pill + small dots) */}
        {activeBanners.length > 1 && (
          <div className="absolute bottom-3.5 sm:bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {activeBanners.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(dotIdx);
                }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  dotIdx === currentIndex
                    ? 'w-6 sm:w-7 h-1.5 bg-[#4F5E4E]' // active elongated pill matching screenshot
                    : 'w-1.5 h-1.5 bg-black/25 hover:bg-black/40'
                }`}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
