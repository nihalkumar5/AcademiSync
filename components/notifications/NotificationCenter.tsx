'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { NotificationCategory } from '@/lib/types';
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
  Info,
  Clock
} from 'lucide-react';
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

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'classes':
        return <BookOpen className="w-3.5 h-3.5" />;
      case 'events':
        return <Calendar className="w-3.5 h-3.5" />;
      case 'homework':
        return <CheckSquare className="w-3.5 h-3.5" />;
      case 'deadlines':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'carry':
        return <Backpack className="w-3.5 h-3.5" />;
      default:
        return <Info className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex flex-col gap-3.5 text-left max-w-3xl mx-auto w-full">
      {/* Header section - Compact & Minimal */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black dark:border-white">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-black dark:text-white">
            Inbox
          </h2>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black text-[9px] font-mono font-bold uppercase tracking-wider">
              {unreadCount} NEW
            </span>
          )}
        </div>

        {notifications.length > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="flex items-center gap-1 px-2.5 py-1 border border-black dark:border-white text-[10px] font-bold uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer shrink-0"
          >
            <CheckCheck className="w-3 h-3" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs - Ultra Compact Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
        {(['all', 'classes', 'events', 'homework', 'deadlines', 'carry', 'system'] as const).map((cat) => {
          const isSelected = categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                  : 'border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
              }`}
            >
              {cat === 'all' ? 'All Alerts' : cat}
            </button>
          );
        })}
      </div>

      {/* Notifications Feed */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-5 h-5 text-black/40 dark:text-white/40" />}
          title="Inbox is Empty"
          description="Upcoming class alerts, homework deadlines, and bag carry items will be delivered here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                layout
                onClick={() => markNotificationAsRead(notif.id)}
                className={`group relative flex items-start justify-between gap-3 p-3 sm:p-3.5 border transition-all cursor-pointer ${
                  notif.read
                    ? 'border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] opacity-65 hover:opacity-100 hover:border-black/30'
                    : 'border-black dark:border-white bg-white dark:bg-zinc-950 shadow-sm'
                }`}
              >
                {/* Left accent border for unread */}
                {!notif.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-black dark:bg-white" />
                )}

                <div className="flex items-start gap-3 w-full min-w-0">
                  {/* Category Square Icon */}
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 border flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.read
                        ? 'border-black/20 dark:border-white/20 text-black/40 dark:text-white/40'
                        : 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                    }`}
                  >
                    {getCategoryIcon(notif.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4
                          className={`text-xs sm:text-sm font-bold tracking-tight truncate ${
                            notif.read
                              ? 'text-black/70 dark:text-white/70'
                              : 'text-black dark:text-white'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        )}
                      </div>

                      <span className="font-mono text-[9px] sm:text-[10px] text-black/50 dark:text-white/50 shrink-0">
                        {new Date(notif.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-black/70 dark:text-white/70 leading-normal font-medium line-clamp-2 sm:line-clamp-none">
                      {notif.message}
                    </p>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                  }}
                  className="p-1 text-black/30 dark:text-white/30 hover:text-rose-500 dark:hover:text-rose-400 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
                  title="Delete Notification"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
