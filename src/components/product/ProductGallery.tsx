import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ZoomIn } from 'lucide-react';

interface ProductGalleryProps {
  images: string[];
  productName: string;
  isJewellery?: boolean;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  productName,
  isJewellery = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4">
      {/* Thumbnail List */}
      {images.length > 1 && (
        <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[520px] scrollbar-none shrink-0 py-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-16 h-20 md:w-20 md:h-24 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                currentIndex === idx
                  ? 'border-brand-lilac ring-2 ring-brand-lilac/30 scale-95'
                  : 'border-brand-border opacity-70 hover:opacity-100 hover:border-brand-muted-light'
              }`}
            >
              <img
                src={img}
                alt={`${productName} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image Frame */}
      <div
        className="relative flex-1 aspect-[4/5] rounded-xl overflow-hidden bg-brand-ivory border border-brand-border cursor-crosshair group select-none shadow-sm"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        <img
          src={images[currentIndex]}
          alt={productName}
          className={`w-full h-full object-cover transition-transform duration-200 ${
            isZoomed ? 'scale-150' : 'scale-100'
          }`}
          style={
            isZoomed
              ? {
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                }
              : undefined
          }
        />

        {/* Floating badge */}
        {isJewellery ? (
          <div className="absolute top-4 left-4 bg-brand-charcoal/80 backdrop-blur-md text-brand-butter px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-brand-butter" />
            <span>18K PVD Anti-Tarnish</span>
          </div>
        ) : (
          <div className="absolute top-4 left-4 bg-brand-lilac/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
            ☁️ Cloud-Soft Fabric
          </div>
        )}

        {/* Zoom Hint Icon */}
        <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-md p-2 rounded-full text-brand-charcoal opacity-70 group-hover:opacity-100 transition-opacity hidden md:block">
          <ZoomIn className="w-4 h-4" />
        </div>

        {/* Navigation Arrows for Mobile / Quick Browse */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-brand-charcoal flex items-center justify-center shadow-md transition-all active:scale-90"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-brand-charcoal flex items-center justify-center shadow-md transition-all active:scale-90"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
