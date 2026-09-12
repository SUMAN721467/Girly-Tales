import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'gold' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-full transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer tracking-wide select-none';

  const sizeStyles = {
    sm: 'text-xs px-4 py-2 gap-1.5',
    md: 'text-sm px-6 py-3 gap-2',
    lg: 'text-base px-8 py-3.5 gap-2.5 shadow-md',
  };

  const variantStyles = {
    primary:
      'bg-[#967BB6] hover:bg-[#7F62A1] active:bg-[#6D528F] text-white font-bold shadow-md hover:shadow-lg shadow-[#967BB6]/30 hover:-translate-y-0.5',
    secondary:
      'bg-[#fffee3] hover:bg-[#EDEAB0] text-brand-charcoal font-semibold shadow-soft hover:-translate-y-0.5 border border-brand-border',
    outline:
      'border border-[#967BB6]/50 text-brand-charcoal hover:bg-[#F5EEFA] hover:border-[#967BB6]',
    gold:
      'bg-gradient-to-r from-[#D4AF37] to-[#E9CB74] hover:from-[#C5A028] hover:to-[#DFC169] text-[#1A1821] font-semibold shadow-gold-glow hover:-translate-y-0.5',
    dark:
      'bg-[#1A1821] hover:bg-black text-white shadow-md hover:-translate-y-0.5',
    ghost:
      'bg-transparent hover:bg-[#F5EEFA] text-brand-charcoal',
  };

  return (
    <button
      className={twMerge(
        clsx(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          fullWidth && 'w-full',
          className
        )
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Processing...</span>
        </span>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
