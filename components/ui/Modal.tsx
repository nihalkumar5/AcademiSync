'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  showCloseButton?: boolean;
  mobileFullSheet?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  mobileFullSheet = false,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const maxWClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className={clsx(
          "fixed inset-0 z-[9999] flex justify-center overflow-y-auto",
          mobileFullSheet ? "items-start sm:items-center p-0 sm:p-6" : "items-center p-4 sm:p-6"
        )}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog Card */}
          <motion.div
            initial={mobileFullSheet ? { opacity: 0, y: 40, scale: 0.98 } : { opacity: 0, scale: 0.96, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={mobileFullSheet ? { opacity: 0, y: 40, scale: 0.98 } : { opacity: 0, scale: 0.96, y: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className={twMerge(
              clsx(
                'relative bg-white dark:bg-[#111111] border-[#D9D9D6] dark:border-[#333333] z-10 text-left rounded-none',
                mobileFullSheet ? 'w-full' : 'w-full sm:w-full',
                mobileFullSheet ? "min-h-[100dvh] sm:min-h-0 sm:h-auto border-0 sm:border flex flex-col" : "border my-auto max-h-[90dvh] flex flex-col",
                maxWClasses[maxWidth]
              )
            )}
          >
            {(title || showCloseButton) && (
              <div className={clsx(
                "flex items-start justify-between border-b border-[#D9D9D6] dark:border-[#333333] bg-white dark:bg-[#111111]",
                mobileFullSheet 
                  ? "sticky top-0 z-30 px-5 pb-4 pt-[max(env(safe-area-inset-top,0px),2.5rem)] sm:p-5" 
                  : "p-5"
              )}>
                <div className="pr-4">
                  {title && (
                    <h2 className="text-[22px] sm:text-[24px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-snug">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1.5 text-[13.5px] sm:text-[14px] text-[#6F6F6F] dark:text-[#A0A0A0] leading-snug">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onClose();
                    }}
                    aria-label="Close dialog"
                    className="min-w-[44px] min-h-[44px] -mr-2.5 -mt-2 flex items-center justify-center rounded-full transition-all text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 active:bg-black/10 z-40 cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5 pointer-events-none" />
                  </button>
                )}
              </div>
            )}

            <div className={clsx(mobileFullSheet ? "flex-1 overflow-y-auto flex flex-col" : "overflow-y-auto flex-1")}>
              <div className={clsx("p-5", mobileFullSheet ? "flex-1 flex flex-col" : "")}>
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
};
