import React from 'react';

interface SectionHeadingProps {
  subtitle?: string;
  title: string;
  highlightText?: string;
  description?: string;
  align?: 'center' | 'left' | 'right';
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  subtitle,
  title,
  highlightText,
  description,
  align = 'center',
  className = '',
}) => {
  const alignClasses = {
    center: 'text-center items-center',
    left: 'text-left items-start',
    right: 'text-right items-end',
  };

  return (
    <div className={`flex flex-col mb-10 md:mb-14 ${alignClasses[align]} ${className}`}>
      {subtitle && (
        <span className="font-script text-2xl md:text-3xl text-brand-lilac tracking-wide mb-1 font-semibold">
          {subtitle}
        </span>
      )}
      <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight text-brand-charcoal leading-tight">
        {title}{' '}
        {highlightText && (
          <span className="italic font-normal relative inline-block text-brand-lilac">
            {highlightText}
            <span className="absolute -bottom-1 left-0 right-0 h-1 bg-brand-butter/70 -z-10 rounded-full"></span>
          </span>
        )}
      </h2>
      {description && (
        <p className="mt-3 text-brand-muted text-sm md:text-base max-w-xl font-normal leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};
