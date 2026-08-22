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
        'group flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none text-left',
        item.isPacked
          ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-300/70 dark:border-emerald-800/60'
          : 'bg-[#FAF8F5] dark:bg-[#201E1C] border-[#E8E0D5] dark:border-[#2C2926] hover:border-[#8C6B5D]/60 hover:shadow-2xs'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Tactile Circular Toggle Checkbox */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className={clsx(
            'w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shrink-0 cursor-pointer',
            item.isPacked
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
              : 'border-[#C5B7A8] dark:border-[#575048] bg-white dark:bg-[#181716] hover:border-[#8C6B5D]'
          )}
        >
          {item.isPacked && (
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </motion.div>
          )}
        </motion.button>

        {/* Item Title & Origin */}
        <div className="flex flex-col min-w-0">
          <span
            className={clsx(
              'text-xs sm:text-sm font-semibold tracking-tight truncate transition-all',
              item.isPacked
                ? 'line-through text-emerald-700/80 dark:text-emerald-400'
                : 'text-[#1A1918] dark:text-[#F4F1EA]'
            )}
          >
            {item.title}
          </span>

          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#7A6D61] dark:text-[#9A9188] font-medium">
            {item.source === 'subject' ? (
              <span className="flex items-center gap-1 font-mono text-[#8C6B5D] dark:text-[#CBB5A1]">
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
                <span>&bull;</span>
                <span className="truncate italic text-[#9E9084]">{item.reminderNote}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Side Status Pill & Delete button */}
      <div className="flex items-center gap-2 shrink-0 pl-2">
        <span
          className={clsx(
            'text-[10.5px] font-mono px-2 py-0.5 rounded-full transition-colors font-bold border',
            item.isPacked
              ? 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : 'bg-[#EFEAE2] dark:bg-[#282624] text-[#7A6D61] dark:text-[#9E958C] border-[#DFD6CA] dark:border-[#383430]'
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
            className="p-1 text-[#9E9084] hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded-lg cursor-pointer"
            title="Delete item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
