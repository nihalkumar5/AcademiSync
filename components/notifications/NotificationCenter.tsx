'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { NotificationCategory, AppNotification } from '@/lib/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import {
  Bell,
  CheckCheck,
  Trash2,
  BookOpen,
  Calendar,
  CheckSquare,
  AlertCircle,
  Backpack,
  Sparkles,
  Info,
} from 'lucide-react';
import { clsx } from 'clsx';

import { motion, AnimatePresence } from 'framer-motion';

export const NotificationCenter: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<'all' | NotificationCategory>('all');

  const filtered = notifications.filter((n) => {
    if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const categoryIcons: Record<NotificationCategory, React.ReactNode> = {
    classes: <BookOpen className="w-5 h-5 text-[#8C6B5D]" />,
    events: <Calendar className="w-5 h-5 text-amber-500" />,
    homework: <CheckSquare className="w-5 h-5 text-indigo-500" />,
    deadlines: <AlertCircle className="w-5 h-5 text-rose-500" />,
    carry: <Backpack className="w-5 h-5 text-emerald-500" />,
    system: <Info className="w-5 h-5 text-zinc-400" />,
  };

  return (
    <div className="flex flex-col gap-8 text-left max-w-3xl mx-auto w-full">
      {/* Header section - clean & minimal */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            Inbox
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#8C6B5D]/10 dark:bg-[#8C6B5D]/20 text-[#8C6B5D] dark:text-[#CBB5A1] text-xs font-bold tracking-wide">
                {unreadCount} New
              </span>
            )}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium">
            Your personal academic feed
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="text-sm font-semibold text-[#8C6B5D] dark:text-[#CBB5A1] hover:text-[#7A5B4D] transition-colors flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Modern minimal filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {(['all', 'classes', 'events', 'homework', 'deadlines', 'carry', 'system'] as const).map((cat) => {
          const isSelected = categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={clsx(
                'px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0',
                isSelected
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                  : 'bg-zinc-50 text-zinc-500 border-zinc-200/60 hover:text-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-800/80 dark:hover:text-zinc-200'
              )}
            >
              {cat === 'all' ? 'All Alerts' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Notifications feed */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-6 h-6 text-zinc-400" />}
          title="Inbox is empty"
          description="We'll notify you here about upcoming class alerts, homework deadlines, or backpack reminders."
        />
      ) : (
        <div className="flex flex-col gap-4 sm:gap-6 mt-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                layout
                onClick={() => markNotificationAsRead(notif.id)}
                className={clsx(
                  'group relative flex flex-col sm:flex-row sm:items-start justify-between gap-5 p-6 sm:p-7 rounded-[2rem] transition-all cursor-pointer overflow-hidden border',
                  notif.read
                    ? 'bg-zinc-50/50 dark:bg-zinc-900/20 border-transparent opacity-70 hover:opacity-100 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    : 'bg-white dark:bg-[#1A1A1A] border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md'
                )}
              >
                {!notif.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#8C6B5D] to-[#D5C5B4] rounded-l-[2rem]" />
                )}

                <div className="flex gap-5 sm:gap-6 w-full">
                  <div className={clsx(
                    'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5',
                    notif.read ? 'bg-zinc-100 dark:bg-zinc-800/50' : 'bg-[#FEF9C3]/50 dark:bg-[#8C6B5D]/10'
                  )}>
                    {categoryIcons[notif.category] || <Bell className="w-5 h-5 text-zinc-400" />}
                  </div>

                  <div className="flex flex-col gap-2.5 w-full">
                    <div className="flex items-start justify-between gap-4">
                      <h4
                        className={clsx(
                          'text-base sm:text-lg font-black tracking-tight',
                          notif.read ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-50'
                        )}
                      >
                        {notif.title}
                      </h4>
                      <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-zinc-400 shrink-0 mt-1">
                        {new Date(notif.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-[15px] sm:text-base text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl pr-8">
                      {notif.message}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                  }}
                  className="absolute right-4 bottom-4 sm:right-6 sm:top-6 sm:bottom-auto opacity-0 group-hover:opacity-100 p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 rounded-xl transition-all shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
