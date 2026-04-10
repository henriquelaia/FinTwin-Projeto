import { motion } from 'framer-motion';
import clsx from 'clsx';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-7 h-7 border-2',
  lg: 'w-12 h-12 border-[3px]',
};

export function LoadingSpinner({ size = 'md', className }: Props) {
  return (
    <motion.div
      className={clsx(
        'rounded-full border-[#493ee5]/20 border-t-[#493ee5]',
        sizes[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
  );
}
