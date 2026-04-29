import { AnimatePresence, motion } from 'framer-motion';
import { LoadingSpinner } from './LoadingSpinner';

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, description, confirmLabel = 'Apagar',
  isLoading, onConfirm, onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(17,17,16,0.45)', backdropFilter: 'blur(2px)' }}
            onClick={onCancel}
          />
          <motion.div
            className="relative rounded-2xl p-6 max-w-sm w-full"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-base font-bold mb-1.5" style={{ color: 'var(--ink-900)' }}>
              {title}
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--ink-400)' }}>
              {description}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                style={{ border: '1px solid var(--border)', color: 'var(--ink-600)' }}
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors bg-red-600 hover:bg-red-700 disabled:opacity-60"
              >
                {isLoading && <LoadingSpinner size="sm" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
