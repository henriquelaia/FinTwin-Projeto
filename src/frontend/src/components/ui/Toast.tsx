import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, type ToastType } from '../../store/toastStore';

const STYLES: Record<ToastType, { bg: string; border: string; color: string }> = {
  success: { bg: '#f0fdf4', border: '1px solid #86efac', color: '#15803d' },
  error:   { bg: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' },
  warning: { bg: 'var(--gold-subtle)', border: '1px solid var(--gold-border)', color: 'var(--gold)' },
  info:    { bg: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8' },
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} />,
  error:   <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info:    <Info size={16} />,
};

export function ToastContainer() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = STYLES[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-lg min-w-[260px] max-w-xs"
              style={{ background: s.bg, border: s.border, color: s.color }}
            >
              <span className="shrink-0">{ICONS[t.type]}</span>
              <span className="flex-1 text-[13px]">{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Fechar notificação"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
