import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

const variants = {
  primary: 'text-white font-semibold',
  secondary: 'text-[#493ee5] font-semibold border border-[#493ee5]/20',
  danger: 'text-[#ba1a1a] font-semibold border border-[#ba1a1a]/20',
  ghost: 'text-[#464555] font-medium',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

const bgStyles: Record<string, React.CSSProperties> = {
  primary:   { background: 'linear-gradient(135deg, #493ee5 0%, #635bff 100%)', boxShadow: '0 4px 14px rgba(73,62,229,0.35)' },
  secondary: { background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)' },
  danger:    { background: 'rgba(255,218,214,0.7)', backdropFilter: 'blur(12px)' },
  ghost:     { background: 'transparent' },
};

export function GlassButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  className,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={bgStyles[variant]}
      className={clsx(
        'inline-flex items-center justify-center gap-2 transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-[0.97]',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
}
