'use client';

import React, { useState } from 'react';
import { CarryItem } from '@/lib/types';
import { Check, MoreVertical, BookOpen, Tag } from 'lucide-react';
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
        'group flex items-center justify-between py-2.5 transition-all cursor-pointer select-none text-left gap-3 relative',
        item.isPacked ? 'opacity-50' : ''
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Square Checkbox (22x22px) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className={clsx(
            'w-[22px] h-[22px] flex items-center justify-center border transition-all shrink-0 cursor-pointer rounded-none',
            item.isPacked
              ? 'bg-[#111111] dark:bg-[#FFFFFF] border-[#111111] dark:border-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111]'
              : 'bg-[#FFFFFF] dark:bg-transparent border-[#D8D8D8] dark:border-[#333333]'
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
        </button>

        {/* Item Title & Source */}
        <div className="flex flex-col min-w-0 flex-1 pr-1 justify-center">
          <span
            className={clsx(
              'text-[15px] font-[600] tracking-tight truncate transition-all leading-snug',
              item.isPacked
                ? 'line-through text-[#6F6F6F]'
                : 'text-[#111111] dark:text-[#FFFFFF]'
            )}
          >
            {item.title}
          </span>

          <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-[#6F6F6F] font-normal min-w-0">
            {item.source === 'subject' ? (
              <span className="flex items-center gap-1.5 truncate">
                <BookOpen className="w-[13px] h-[13px] shrink-0 stroke-[2]" />
                <span className="truncate">{item.subjectName || 'Required Subject Item'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 truncate">
                <Tag className="w-[13px] h-[13px] shrink-0 stroke-[2]" />
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

      {/* Right Side More Menu */}
      <div className="relative flex items-center shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors cursor-pointer outline-none"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
            <div className="absolute right-0 top-8 w-40 bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] shadow-lg z-50 py-1 flex flex-col">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                className="w-full text-left px-4 py-2 text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#333333] transition-colors cursor-pointer"
              >
                Edit item
              </button>
              {onDelete && item.source === 'custom' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-[13px] font-medium text-[#E03131] hover:bg-[#F7F7F5] dark:hover:bg-[#333333] transition-colors cursor-pointer"
                >
                  Remove from list
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
