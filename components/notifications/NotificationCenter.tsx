'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { NotificationCategory, AppNotification } from '@/lib/types';
import { EmptyState } from '../ui/EmptyState';
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
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationCenter: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'classes' | 'homework' | 'events'>('all');

  const filtered = notifications.filter((n) => {
    if (categoryFilter !== 'all' && n.category !== categoryFilter && !(categoryFilter === 'homework' && n.category === 'deadlines')) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'classes':
        return <Bell className="w-5 h-5 text-black dark:text-white" />;
      case 'events':
        return <Calendar className="w-5 h-5 text-black dark:text-white" />;
      case 'homework':
      case 'deadlines':
        return <CheckSquare className="w-5 h-5 text-black dark:text-white" />;
      case 'carry':
        return <Backpack className="w-5 h-5 text-black dark:text-white" />;
      case 'system':
        return <Users className="w-5 h-5 text-black dark:text-white" />;
      default:
        return <Bell className="w-5 h-5 text-black dark:text-white" />;
    }
  };

  // Grouping Logic
  const needsAttention = filtered.filter(n => !n.read && (n.category === 'deadlines' || n.category === 'homework' || n.category === 'carry'));
  const today = filtered.filter(n => !needsAttention.includes(n) && new Date(n.timestamp).toDateString() === new Date().toDateString());
  const earlier = filtered.filter(n => !needsAttention.includes(n) && !today.includes(n));

  const NotificationCard = ({ n, isImportant }: { n: AppNotification, isImportant?: boolean }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={() => markNotificationAsRead(n.id)}
      className={`group relative flex items-center justify-between cursor-pointer transition-all ${
        isImportant 
          ? 'p-4 border border-black/10 dark:border-white/10 rounded-xl bg-white dark:bg-black shadow-sm mb-2 hover:border-black/30 dark:hover:border-white/30' 
          : 'py-4 border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-4 px-4'
      } ${n.read ? 'opacity-60' : 'opacity-100'}`}
    >
      <div className="flex items-start">
        
        <div className="flex flex-col gap-1">
          <h4 className={`text-[15px] text-black dark:text-white leading-snug tracking-tight ${isImportant ? 'font-bold' : 'font-semibold'}`}>
            {n.title}
          </h4>
          <p className="text-[14px] text-black/60 dark:text-white/60 font-medium leading-snug">
            {n.message}
          </p>
          <span className="text-[12px] text-black/40 dark:text-white/40 font-medium mt-1">
            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity pr-2">
        <ChevronRight className="w-4 h-4 text-black/30 dark:text-white/30" />
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col gap-6 text-left max-w-2xl mx-auto w-full pt-4">
      {/* Header section - Clean Hierarchy */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-black/50 dark:text-white/50 mb-1.5">
            Notifications
          </h2>
          <div className="text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-3">
            {unreadCount} unread
          </div>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="text-[13px] font-bold text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors cursor-pointer mb-1"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs - Underline Style */}
      <div className="flex items-center justify-between w-full border-b border-black/10 dark:border-white/10 mt-2">
        {(['all', 'classes', 'homework', 'events'] as const).map((cat) => {
          const isSelected = categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-1 pb-3 text-center text-[11px] font-bold uppercase tracking-widest transition-colors relative whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'text-black dark:text-white'
                  : 'text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
              {isSelected && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white" 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications Feed */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-6 h-6 text-black/30 dark:text-white/30" />}
          title="All caught up"
          description="You don't have any new notifications."
        />
      ) : (
        <div className="flex flex-col gap-8 pb-10">
          <AnimatePresence mode="popLayout">
            
            {needsAttention.length > 0 && (
              <div className="flex flex-col">
                <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-black/50 dark:text-white/50 mb-3">
                  Needs Attention
                </h3>
                <div className="flex flex-col gap-1">
                  {needsAttention.map(n => <NotificationCard key={n.id} n={n} isImportant={true} />)}
                </div>
              </div>
            )}

            {today.length > 0 && (
              <div className="flex flex-col">
                <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-black/50 dark:text-white/50 mb-2 mt-2">
                  Today
                </h3>
                <div className="flex flex-col">
                  {today.map(n => <NotificationCard key={n.id} n={n} />)}
                </div>
              </div>
            )}

            {earlier.length > 0 && (
              <div className="flex flex-col">
                <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-black/50 dark:text-white/50 mb-2 mt-4">
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
