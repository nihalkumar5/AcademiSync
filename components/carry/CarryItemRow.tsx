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
        'group flex items-center justify-between p-3.5 border transition-all cursor-pointer select-none text-left',
        item.isPacked
          ? 'border-emerald-600/50 dark:border-emerald-700/50 opacity-60'
          : 'border-black dark:border-white hover:bg-black/3 dark:hover:bg-white/3'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Square checkbox — brutalist */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className={clsx(
            'w-5 h-5 flex items-center justify-center border transition-all shrink-0 cursor-pointer',
            item.isPacked
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'border-black dark:border-white bg-transparent'
          )}
        >
          {item.isPacked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
            </motion.div>
          )}
        </motion.button>

        {/* Item Title & Origin */}
        <div className="flex flex-col min-w-0">
          <span
            className={clsx(
              'text-xs sm:text-sm font-semibold tracking-tight truncate transition-all',
              item.isPacked
                ? 'line-through text-black/40 dark:text-white/40'
                : 'text-black dark:text-white'
            )}
          >
            {item.title}
          </span>

          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-black/50 dark:text-white/50 font-medium">
            {item.source === 'subject' ? (
              <span className="flex items-center gap-1 font-mono">
                <BookOpen className="w-3 h-3" />
                <span>{item.subjectName || 'Required Subject Item'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 font-mono text-amber-700 dark:text-amber-400">
                <Tag className="w-3 h-3" />
                <span>Custom Item</span>
              </span>
            )}
            {item.reminderNote && (
              <>
                <span>•</span>
                <span className="truncate italic">{item.reminderNote}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Side Status Tag & Delete button */}
      <div className="flex items-center gap-2 shrink-0 pl-2">
        <span
          className={clsx(
            'text-[10.5px] font-mono px-2 py-0.5 transition-colors font-bold border',
            item.isPacked
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-black/30 dark:border-white/30 text-black/60 dark:text-white/60'
          )}
        >
          {item.isPacked ? 'Packed' : 'To Pack'}
        </span>

        {item.source === 'custom' && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1 text-black/30 hover:text-rose-600 dark:text-white/30 dark:hover:text-rose-400 transition-colors cursor-pointer"
            title="Delete item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
