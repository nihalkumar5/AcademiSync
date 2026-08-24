'use client';

import React from 'react';
import { CarryItem } from '@/lib/types';
import { Check, Trash2, Tag, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export interface CarryItemRowProps {
  item: CarryItem;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const CarryItemRow: React.FC<CarryItemRowProps> = ({ item, onToggle, onDelete }) => {
  return (
    <motion.div
      layout
      onClick={() => onToggle(item.id)}
      className={clsx(
        'group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none text-left',
        item.isPacked
          ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/70 dark:border-emerald-900/40 opacity-75'
          : 'bg-white dark:bg-zinc-900/70 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-md'
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Soft rounded checkbox */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className={clsx(
            'w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 cursor-pointer',
            item.isPacked
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
              : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:border-zinc-400'
          )}
        >
          {item.isPacked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </motion.div>
          )}
        </motion.button>

        {/* Item Title & Origin */}
        <div className="flex flex-col min-w-0">
          <span
            className={clsx(
              'text-sm font-semibold tracking-tight truncate transition-all',
              item.isPacked
                ? 'line-through text-zinc-400 dark:text-zinc-500'
                : 'text-zinc-900 dark:text-zinc-100'
            )}
          >
            {item.title}
          </span>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            {item.source === 'subject' ? (
              <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-[#8C6B5D]" />
                <span className="truncate">{item.subjectName || 'Required Subject Item'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <Tag className="w-3.5 h-3.5" />
                <span>Custom Item</span>
              </span>
            )}
            {item.reminderNote && (
              <>
                <span>•</span>
                <span className="truncate italic text-zinc-400">{item.reminderNote}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Side Status Tag & Delete button */}
      <div className="flex items-center gap-2.5 shrink-0 pl-2">
        <span
          className={clsx(
            'text-[11px] px-2.5 py-1 rounded-full transition-colors font-semibold',
            item.isPacked
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          )}
        >
          {item.isPacked ? 'Packed' : 'To Pack'}
        </span>

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Delete item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
