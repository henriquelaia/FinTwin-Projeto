import clsx from 'clsx';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddings = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

export function GlassCard({ children, className, padding = 'md', hover = false }: Props) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-white/60',
        'backdrop-blur-xl',
        paddings[padding],
        hover && 'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer',
        className
      )}
      style={{
        background: 'rgba(255,255,255,0.72)',
        boxShadow: '0 4px 24px rgba(73,62,229,0.07), 0 1px 0 rgba(255,255,255,0.8) inset',
      }}
    >
      {children}
    </div>
  );
}
