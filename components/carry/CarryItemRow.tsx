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
        'group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none text-left',
        item.isPacked
          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/30 text-zinc-500 dark:text-zinc-400'
          : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
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
            'w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0',
            item.isPacked
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 bg-white dark:bg-zinc-800'
          )}
        >
          {item.isPacked ? (
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <Circle className="w-3 h-3 text-transparent" />
          )}
        </button>

        {/* Item Title & Origin */}
        <div className="flex flex-col min-w-0">
          <span
            className={clsx(
              'text-xs sm:text-sm font-medium tracking-tight truncate transition-all',
              item.isPacked
                ? 'line-through text-zinc-400 dark:text-zinc-500'
                : 'text-zinc-900 dark:text-zinc-100'
            )}
          >
            {item.title}
          </span>

          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
            {item.source === 'subject' ? (
              <span className="flex items-center gap-1 font-mono text-zinc-500 dark:text-zinc-400">
                <BookOpen className="w-3 h-3 text-blue-500" />
                {item.subjectName || 'Required Subject Item'}
              </span>
            ) : (
              <span className="flex items-center gap-1 font-mono text-amber-500">
                <Tag className="w-3 h-3" />
                Custom Item
              </span>
            )}
            {item.reminderNote && (
              <>
                <span>·</span>
                <span className="truncate italic text-zinc-500">{item.reminderNote}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Side Indicator & Delete for custom items */}
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            'text-[10.5px] font-mono px-2 py-0.5 rounded-full transition-colors font-medium',
            item.isPacked
              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
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
            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 transition-all rounded"
            title="Delete custom item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
