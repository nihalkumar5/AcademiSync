'use client';

import React, { useEffect, ReactNode } from 'react';
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={clsx(
          "fixed inset-0 z-50 flex justify-center overflow-y-auto",
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
            className={twMerge(
              clsx(
                
                'relative bg-white dark:bg-[#111111] border-[#D9D9D6] dark:border-[#333333] z-10 text-left rounded-none',
                mobileFullSheet ? 'w-full' : 'w-[calc(100%-32px)] sm:w-full',
                mobileFullSheet ? "min-h-[100dvh] sm:min-h-0 sm:h-auto border-0 sm:border flex flex-col" : "border my-auto",
                maxWClasses[maxWidth]
              )
            )}
          >
            {(title || showCloseButton) && (
              <div className={clsx(
                "flex items-start justify-between p-5 border-b border-[#D9D9D6] dark:border-[#333333] bg-white dark:bg-[#111111]",
                mobileFullSheet ? "sticky top-0 z-20" : ""
              )}>
                <div>
                  {title && (
                    <h2 className="text-[24px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-none">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-2 text-[14px] text-[#6F6F6F] leading-snug">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1.5 shrink-0 transition-opacity text-[#111111] dark:text-[#FFFFFF] hover:opacity-70 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            <div className={clsx(mobileFullSheet ? "flex-1 overflow-y-auto flex flex-col" : "")}>
              <div className={clsx("p-5", mobileFullSheet ? "flex-1 flex flex-col" : "")}>
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
