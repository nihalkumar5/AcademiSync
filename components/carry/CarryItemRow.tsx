'use client';

import React, { useState } from 'react';
import { CarryItem } from '@/lib/types';
import { Check, MoreVertical, BookOpen, Tag, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export interface CarryItemRowProps {
  item: CarryItem;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const CarryItemRow: React.FC<CarryItemRowProps> = ({ item, onToggle, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      layout
      onClick={() => onToggle(item.id)}
      className={clsx(
        'group flex items-center justify-between p-3.5 sm:p-4 rounded-[12px] border transition-all cursor-pointer select-none text-left gap-3 relative',
        item.isPacked
          ? 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.05] dark:border-white/[0.05] opacity-65'
          : 'bg-[#FFFFFF] dark:bg-[#15171E] border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 shadow-xs hover:shadow-sm'
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Custom Rounded Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className={clsx(
            'w-[22px] h-[22px] flex items-center justify-center rounded-[6px] border transition-all shrink-0 cursor-pointer',
            item.isPacked
              ? 'bg-[#18A889] border-[#18A889] text-white shadow-xs'
              : 'bg-transparent border-[#D1D1D1] dark:border-white/20 hover:border-[#18A889] dark:hover:border-[#18A889]'
          )}
        >
          {item.isPacked && (
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </motion.div>
          )}
        </button>

        {/* Item Title & Source */}
        <div className="flex flex-col min-w-0 flex-1 pr-1 justify-center gap-0.5">
          <span
            className={clsx(
              'text-[14.5px] sm:text-[15px] font-bold tracking-tight truncate transition-all leading-snug',
              item.isPacked
                ? 'line-through text-[#808080] dark:text-[#64748B]'
                : 'text-[#151515] dark:text-[#F4F4F6]'
            )}
          >
            {item.title}
          </span>

          <div className="flex items-center gap-2 text-[11.5px] text-[#6F6F6F] dark:text-[#94A3B8] font-medium min-w-0 flex-wrap">
            {item.source === 'subject' ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium truncate">
                <BookOpen className="w-[12px] h-[12px] shrink-0" />
                <span className="truncate">{item.subjectName || 'Required Subject Item'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium truncate">
                <Tag className="w-[12px] h-[12px] shrink-0" />
                <span className="truncate">Custom Item</span>
              </span>
            )}
            {item.reminderNote && (
              <span className="truncate italic text-zinc-500 dark:text-zinc-400">
                • {item.reminderNote}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Side More Menu */}
      <div className="relative flex items-center shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 text-[#808080] hover:text-[#111111] dark:text-[#94A3B8] dark:hover:text-white transition-colors cursor-pointer rounded-[4px] hover:bg-black/5 dark:hover:bg-white/10"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20" 
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} 
            />
            <div 
              className="absolute right-0 top-full mt-1.5 w-44 rounded-[10px] bg-[#FFFFFF] dark:bg-[#18191E] border border-black/10 dark:border-white/[0.1] shadow-[0_12px_36px_rgba(0,0,0,0.22)] py-1.5 z-50 flex flex-col text-left overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {onDelete && item.source === 'custom' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full text-left px-3.5 py-2 text-[12.5px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Remove from list</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
