'use client';

import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Trash2, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  highlightText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed? This action cannot be undone.',
  highlightText,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      maxWidth="sm"
      showCloseButton={!isLoading}
    >
      <div className="flex flex-col text-left">
        {/* Header with Icon */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className={`w-10 h-10 shrink-0 rounded-none border flex items-center justify-center ${
            variant === 'danger'
              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400'
              : variant === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400'
              : 'bg-zinc-100 dark:bg-white/[0.05] border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200'
          }`}>
            {variant === 'danger' ? (
              <Trash2 className="w-5 h-5" />
            ) : variant === 'warning' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-[16px] sm:text-[17px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-snug">
              {title}
            </h3>
            <p className="mt-1 text-[13px] text-[#6F6F6F] dark:text-[#94A3B8] leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Monospace Highlight Box */}
        {highlightText && (
          <div className="mb-5 p-2.5 bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 text-[12px] font-mono text-[#111111] dark:text-[#F4F4F6] rounded-none break-all select-all">
            {highlightText}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/5 dark:border-white/[0.08] mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="h-9 px-4 rounded-none text-xs font-mono uppercase tracking-wider"
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className={`h-9 px-4 rounded-none text-xs font-mono uppercase tracking-wider ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-transparent'
                : ''
            }`}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
