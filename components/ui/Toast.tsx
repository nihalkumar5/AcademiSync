'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Info, AlertTriangle, X, type LucideIcon } from '@/components/ui/icons';

type ToastType = 'info' | 'success' | 'warning' | 'error';

// Inverted surface (black on light, white on dark); colour only on the status mark.
const TYPE_META: Record<ToastType, { Icon: LucideIcon; dot: string; bar: string; label: string }> = {
  success: { Icon: Check, dot: 'bg-[#10B981] text-white', bar: 'bg-[#10B981]', label: 'Success' },
  info: { Icon: Info, dot: 'bg-white/15 text-on-ink dark:bg-black/10', bar: 'bg-white/50 dark:bg-black/40', label: 'Info' },
  warning: { Icon: AlertTriangle, dot: 'bg-[#F59E0B] text-[#111111]', bar: 'bg-[#F59E0B]', label: 'Warning' },
  error: { Icon: X, dot: 'bg-[#EF4444] text-white', bar: 'bg-[#EF4444]', label: 'Error' },
};

const DURATION = 2.5; // matches showToast's timeout

export const Toast: React.FC = () => {
  const { toastMessage } = useApp();
  const [mounted, setMounted] = React.useState(false);
  const [dismissedId, setDismissedId] = React.useState<number | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const visible = toastMessage && toastMessage.id !== dismissedId ? toastMessage : null;
  const meta = TYPE_META[(visible?.type as ToastType) || 'info'];
  const isAlert = visible?.type === 'error' || visible?.type === 'warning';

  const content = (
    <div
      className="fixed inset-x-0 z-[100000] pointer-events-none flex justify-center px-4 bottom-[max(calc(env(safe-area-inset-bottom,0px)+84px),92px)] md:bottom-6 md:justify-end md:px-6"
    >
      <AnimatePresence mode="popLayout">
        {visible && (
          <motion.div
            key={visible.id}
            role={isAlert ? 'alert' : 'status'}
            aria-live={isAlert ? 'assertive' : 'polite'}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 80) setDismissedId(visible.id);
            }}
            className="pointer-events-auto relative w-full max-w-[400px] overflow-hidden bg-ink text-on-ink shadow-[0_12px_40px_-8px_rgba(0,0,0,0.35)] dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)] touch-pan-y cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-start gap-3 pl-4 pr-2 py-3.5">
              <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${meta.dot}`} aria-hidden="true">
                <meta.Icon className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
              <div className="flex-1 min-w-0">
                <span className="sr-only">{meta.label}: </span>
                <p className="text-[14px] font-semibold leading-snug break-words">{visible.title}</p>
                {visible.message && (
                  <p className="mt-0.5 text-[13px] leading-snug text-white/65 dark:text-[#111111]/60 break-words">
                    {visible.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDismissedId(visible.id)}
                aria-label="Dismiss notification"
                className="w-9 h-9 shrink-0 -mt-1 flex items-center justify-center text-white/50 hover:text-on-ink dark:text-[#111111]/45 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Time left */}
            <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-white/10 dark:bg-black/10">
              <motion.div
                className={`h-full origin-left ${meta.bar}`}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: DURATION, ease: 'linear' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(content, document.body);
};
