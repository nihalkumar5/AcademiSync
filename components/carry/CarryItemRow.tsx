'use client';

import React from 'react';
import { CarryItem } from '@/lib/types';
import { Check, Circle, Trash2, Tag, BookOpen, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export interface CarryItemRowProps {
  item: CarryItem;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const CarryItemRow: React.FC<CarryItemRowProps> = ({ item, onToggle, onDelete }) => {
  return (
    <div
      onClick={() => onToggle(item.id)}
      className={clsx(
        'group flex items-center justify-between p-3.5 rounded-none border-2 transition-all cursor-pointer select-none text-left shadow-[2px_2px_0_rgba(0,0,0,1)] dark:shadow-[2px_2px_0_rgba(255,255,255,1)] hover:-translate-y-0.5',
        item.isPacked
          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
          : 'bg-white dark:bg-black border-black dark:border-white hover:border-black dark:hover:border-white'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Toggle Checkbox Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className={clsx(
            'w-5 h-5 rounded-none border-2 flex items-center justify-center transition-all shrink-0',
            item.isPacked
              ? 'bg-white text-black dark:bg-black dark:text-white border-current'
              : 'border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
          )}
        >
          {item.isPacked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Item Title & Origin */}
        <div className="flex flex-col min-w-0">
          <span
            className={clsx(
              'text-xs sm:text-sm font-bold uppercase tracking-tight truncate transition-all',
              item.isPacked
                ? 'line-through opacity-70'
                : ''
            )}
          >
            {item.title}
          </span>

          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-bold opacity-70">
            {item.source === 'subject' ? (
              <span className="flex items-center gap-1 font-mono uppercase">
                <BookOpen className="w-3 h-3" />
                {item.subjectName || 'Required Subject Item'}
              </span>
            ) : (
              <span className="flex items-center gap-1 font-mono uppercase">
                <Tag className="w-3 h-3" />
                Custom Item
              </span>
            )}
            {item.reminderNote && (
              <>
                <span>·</span>
                <span className="truncate italic">{item.reminderNote}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Side Indicator & Delete for custom items */}
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            'text-[10.5px] font-mono px-2 py-0.5 border-2 rounded-none transition-colors font-bold uppercase',
            item.isPacked
              ? 'border-transparent'
              : 'border-black dark:border-white'
          )}
        >
          {item.isPacked ? '✓ Packed' : '○ Not Packed'}
        </span>

        {item.source === 'custom' && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white border-2 border-transparent hover:border-red-500 transition-colors"
            aria-label="Delete custom item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
