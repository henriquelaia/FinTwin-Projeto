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
  secondary: 'font-semibold',
  danger: 'text-[#b91c1c] font-semibold',
  ghost: 'font-medium',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

const bgStyles: Record<string, React.CSSProperties> = {
  primary:   {
    background: 'var(--ink-900)',
    boxShadow: '0 4px 14px rgba(17,17,16,0.18)',
  },
  secondary: {
    background: 'var(--gold-subtle)',
    color: 'var(--gold)',
    border: '1px solid var(--gold-border)',
  },
  danger:    {
    background: 'rgba(254,226,226,0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(185,28,28,0.18)',
  },
  ghost:     {
    background: 'transparent',
    color: 'var(--ink-500)',
  },
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
        'active:scale-[0.97] hover:opacity-90',
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
