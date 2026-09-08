import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showCountText?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  reviewCount,
  size = 'sm',
  showCountText = true,
}) => {
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center text-[#E5A823]">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.floor(rating);
          const half = !filled && star === Math.ceil(rating) && rating % 1 >= 0.3;

          return (
            <Star
              key={star}
              className={`${iconSizes[size]} ${
                filled
                  ? 'fill-[#E5A823] text-[#E5A823]'
                  : half
                  ? 'fill-[#E5A823]/60 text-[#E5A823]'
                  : 'text-gray-300'
              }`}
            />
          );
        })}
      </div>
      {showCountText && (
        <span className={`text-brand-muted font-medium ${textSizes[size]}`}>
          {rating.toFixed(1)}
          {reviewCount !== undefined && ` (${reviewCount})`}
        </span>
      )}
    </div>
  );
};
