'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { NotificationCategory, AppNotification } from '@/lib/types';
import { EmptyState } from '../ui/EmptyState';
import { dedupeNotifications } from '@/lib/notificationDedupe';
import {
  Bell,
  CheckCheck,
  BookOpen,
  Calendar,
  CheckSquare,
  AlertCircle,
  Backpack,
  Info,
  ChevronRight,
  Clock,
  Users,
  Repeat
} from '@/components/ui/icons';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationCenter: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'classes' | 'homework' | 'events'>('all');

  const deduped = dedupeNotifications(notifications);

  const filtered = deduped.filter((n) => {
    if (categoryFilter !== 'all' && n.category !== categoryFilter && !(categoryFilter === 'homework' && n.category === 'deadlines')) return false;
    return true;
  });

  const unreadCount = deduped.filter((n) => !n.read).length;

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'classes':
        return <Bell className="w-5 h-5 text-fg" />;
      case 'events':
        return <Calendar className="w-5 h-5 text-fg" />;
      case 'homework':
      case 'deadlines':
        return <CheckSquare className="w-5 h-5 text-fg" />;
      case 'carry':
        return <Backpack className="w-5 h-5 text-fg" />;
      case 'routines':
        return <Repeat className="w-5 h-5 text-fg" />;
      case 'system':
        return <Users className="w-5 h-5 text-fg" />;
      default:
        return <Bell className="w-5 h-5 text-fg" />;
    }
  };

  // Grouping Logic
  const needsAttention = Array.isArray(filtered)
    ? filtered.filter(n => n && !n.read && (n.category === 'deadlines' || n.category === 'homework' || n.category === 'carry' || n.category === 'routines'))
    : [];
  const needsAttentionIds = new Set(needsAttention.map(n => n?.id).filter(Boolean));
  const today = Array.isArray(filtered)
    ? filtered.filter(n => {
        if (!n || needsAttentionIds.has(n.id)) return false;
        const d = new Date(n.timestamp);
        return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
      })
    : [];
  const todayIds = new Set(today.map(n => n?.id).filter(Boolean));
  const earlier = Array.isArray(filtered)
    ? filtered.filter(n => n && !needsAttentionIds.has(n.id) && !todayIds.has(n.id))
    : [];

  const NotificationCard = ({ n, isImportant }: { n: AppNotification, isImportant?: boolean }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={() => markNotificationAsRead(n.id)}
      className={`group relative flex items-center justify-between cursor-pointer transition-all ${
        isImportant 
          ? 'p-4 border border-line rounded-none bg-surface shadow-sm mb-2 hover:border-black/30 dark:hover:border-white/20' 
          : 'py-4 border-b border-line-soft last:border-0 hover:bg-surface-2 -mx-4 px-4'
      } ${n.read ? 'opacity-60' : 'opacity-100'}`}
    >
      <div className="flex items-start">
        
        <div className="flex flex-col gap-1">
          <h4 className={`text-[15px] text-fg leading-snug tracking-tight ${isImportant ? 'font-bold' : 'font-semibold'}`}>
            {n.title}
          </h4>
          <p className="text-[14px] text-muted font-medium leading-snug">
            {n.message}
          </p>
          <span className="text-[12px] text-muted font-medium mt-1">
            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity pr-2">
        <ChevronRight className="w-4 h-4 text-muted" />
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left max-w-2xl mx-auto w-full">
      {/* Header section - Clean Hierarchy */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[12px] font-bold text-muted mb-1.5">
            Notifications
          </h2>
          <div className="text-2xl font-bold tracking-tight text-fg flex items-center gap-3">
            {unreadCount} unread
          </div>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="text-[13px] font-bold text-muted hover:text-fg transition-colors cursor-pointer mb-1"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs - Underline Style */}
      <div className="flex items-center justify-between w-full border-b border-line mt-2">
        {(['all', 'classes', 'homework', 'events'] as const).map((cat) => {
          const isSelected = categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-1 pb-3 text-center text-[13px] font-bold capitalize transition-colors relative whitespace-nowrap cursor-pointer ${
 isSelected
 ? 'text-fg'
 : 'text-muted hover:text-black/70 dark:hover:text-[#F4F4F6]/70'
 }`}
            >
              {cat === 'all' ? 'All' : cat}
              {isSelected && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink" 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications Feed */}
      {filtered.length === 0 ? (
        <EmptyState
          illustration="notifications"
          title="All caught up"
          description="You don't have any new notifications."
        />
      ) : (
        <div className="flex flex-col gap-8 pb-10">
          <AnimatePresence mode="popLayout">
            
            {needsAttention.length > 0 && (
              <div className="flex flex-col">
                <h3 className="text-[12px] font-bold text-muted mb-3">
                  Needs Attention
                </h3>
                <div className="flex flex-col gap-1">
                  {needsAttention.map(n => <NotificationCard key={n.id} n={n} isImportant={true} />)}
                </div>
              </div>
            )}

            {today.length > 0 && (
              <div className="flex flex-col">
                <h3 className="text-[12px] font-bold text-muted mb-2 mt-2">
                  Today
                </h3>
                <div className="flex flex-col">
                  {today.map(n => <NotificationCard key={n.id} n={n} />)}
                </div>
              </div>
            )}

            {earlier.length > 0 && (
              <div className="flex flex-col">
                <h3 className="text-[12px] font-bold text-muted mb-2 mt-4">
                  Earlier
                </h3>
                <div className="flex flex-col">
                  {earlier.map(n => <NotificationCard key={n.id} n={n} />)}
                </div>
              </div>
            )}

          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
