import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import banner1 from '../../assets/banner1.png';
import banner2 from '../../assets/banner2.png';
import banner3 from '../../assets/banner3.png';

interface BannerCarouselProps {
  onNavigate: (page: string, category?: string) => void;
}

const BANNERS = [
  {
    id: 'b1',
    image: banner1,
    alt: 'Girly Tales Launch Offer',
    category: 'all',
  },
  {
    id: 'b2',
    image: banner2,
    alt: 'Girly Tales Nightwear & Jewellery Collection',
    category: 'nightwear',
  },
  {
    id: 'b3',
    image: banner3,
    alt: 'Girly Tales 18K Anti-Tarnish Jewels',
    category: 'jewellery',
  },
];

export const BannerCarousel: React.FC<BannerCarouselProps> = ({ onNavigate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Auto-slide every 2 seconds
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? BANNERS.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
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

  const currentBanner = BANNERS[currentIndex];

  return (
    <div
      className="relative w-full overflow-hidden bg-[#FEFDEB] select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Full-width responsive banner wrapper */}
      <div
        onClick={() => onNavigate('shop', currentBanner.category)}
        className="relative w-full h-[180px] sm:h-[300px] md:h-[420px] lg:h-[500px] xl:h-[560px] cursor-pointer"
      >
        {/* Banner Images with smooth fade transition */}
        {BANNERS.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img
              src={banner.image}
              alt={banner.alt}
              className="w-full h-full object-cover object-center"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}

        {/* Previous Arrow (Hover only on desktop) */}
        <button
          onClick={handlePrev}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white text-brand-charcoal flex items-center justify-center shadow-md transition-all active:scale-95 opacity-0 group-hover:opacity-100"
          aria-label="Previous Banner"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Next Arrow (Hover only on desktop) */}
        <button
          onClick={handleNext}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white text-brand-charcoal flex items-center justify-center shadow-md transition-all active:scale-95 opacity-0 group-hover:opacity-100"
          aria-label="Next Banner"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
    </div>
  );
};
