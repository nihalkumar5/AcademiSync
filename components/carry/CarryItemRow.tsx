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
        'group flex items-center justify-between p-4 sm:p-4.5 border rounded-none transition-all cursor-pointer select-none text-left gap-3',
        item.isPacked
          ? 'border-emerald-600/40 dark:border-emerald-700/40 bg-emerald-500/[0.04] opacity-65'
          : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white bg-white/40 dark:bg-zinc-900/40 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Square Checkbox */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className={clsx(
            'w-5 h-5 rounded-none flex items-center justify-center border transition-all shrink-0 cursor-pointer',
            item.isPacked
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'border-black/40 dark:border-white/40 group-hover:border-black dark:group-hover:border-white bg-transparent'
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
        <div className="flex flex-col min-w-0 flex-1 pr-1">
          <span
            className={clsx(
              'text-sm font-bold tracking-tight truncate transition-all leading-snug',
              item.isPacked
                ? 'line-through text-black/40 dark:text-white/40'
                : 'text-black dark:text-white'
            )}
          >
            {item.title}
          </span>

          <div className="flex items-center gap-2 mt-1 text-xs text-black/55 dark:text-white/55 font-medium min-w-0">
            {item.source === 'subject' ? (
              <span className="flex items-center gap-1.5 font-mono truncate">
                <BookOpen className="w-3 h-3 text-[#8C6B5D] shrink-0" />
                <span className="truncate">{item.subjectName || 'Required Subject Item'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-mono text-amber-700 dark:text-amber-400 truncate">
                <Tag className="w-3 h-3 shrink-0" />
                <span className="truncate">Custom Item</span>
              </span>
            )}
            {item.reminderNote && (
              <>
                <span className="shrink-0">•</span>
                <span className="truncate italic">{item.reminderNote}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Side Status Tag & Delete button */}
      <div className="flex items-center gap-2 shrink-0 pl-1">
        <span
          className={clsx(
            'text-[11px] font-mono px-2.5 py-0.5 transition-colors font-bold border rounded-none whitespace-nowrap',
            item.isPacked
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
              : 'border-black/30 dark:border-white/30 text-black/60 dark:text-white/60 bg-transparent'
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
            className="p-1 text-black/40 dark:text-white/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Delete item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
