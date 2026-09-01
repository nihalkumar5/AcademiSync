'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, query, where, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PromotionalCampaign } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { Sparkles, ExternalLink, X, Film, ShoppingBag, Calendar, Tag, Megaphone, ChevronRight } from 'lucide-react';

interface CampusSpotlightCardProps {
  placement?: 'home' | 'timetable' | 'calendar';
  className?: string;
}

export const CampusSpotlightCard: React.FC<CampusSpotlightCardProps> = ({
  placement = 'home',
  className = '',
}) => {
  const { profile } = useApp();
  const [campaigns, setCampaigns] = useState<PromotionalCampaign[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const trackedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'promotional_campaigns'),
        where('isActive', '==', true)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched: PromotionalCampaign[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as PromotionalCampaign;
          
          // If audience is universal 'all', it matches everyone
          if (data.targetAudienceType === 'all') {
            fetched.push({ ...data, id: docSnap.id });
            return;
          }

          const userCollege = (profile.college || '').toLowerCase().trim();
          const userBranch = (profile.branch || '').toLowerCase().trim();
          const userSemester = profile.semester;

          // 1. College Match
          const collegeMatch =
            !data.targetColleges ||
            data.targetColleges.length === 0 ||
            data.targetColleges.some((c) => {
              const target = c.toLowerCase().trim();
              return userCollege.includes(target) || target.includes(userCollege);
            });

          // 2. Branch Match
          const branchMatch =
            !data.targetBranches ||
            data.targetBranches.length === 0 ||
            data.targetBranches.some((b) => {
              const target = b.toLowerCase().trim();
              return userBranch.includes(target) || target.includes(userBranch);
            });

          // 3. Semester Match
          const semesterMatch =
            !data.targetSemesters ||
            data.targetSemesters.length === 0 ||
            (userSemester && data.targetSemesters.includes(userSemester));

          if (collegeMatch && branchMatch && semesterMatch) {
            fetched.push({ ...data, id: docSnap.id });
          }
        });

        setCampaigns(fetched);
      }, (err) => {
        console.error('Error fetching campaigns:', err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error('Campaign listener error:', e);
    }
  }, [profile.college, profile.branch]);

  const currentCampaign = campaigns[currentIndex];

  // Track impression once per campaign per session
  useEffect(() => {
    if (currentCampaign && !trackedImpressions.current.has(currentCampaign.id)) {
      trackedImpressions.current.add(currentCampaign.id);
      try {
        const docRef = doc(db, 'promotional_campaigns', currentCampaign.id);
        updateDoc(docRef, {
          impressions: increment(1),
        }).catch(() => {});
      } catch (e) {}
    }
  }, [currentCampaign]);

  if (profile?.isPro || isDismissed || !currentCampaign || campaigns.length === 0) {
    return null;
  }

  const handleActionClick = () => {
    try {
      const docRef = doc(db, 'promotional_campaigns', currentCampaign.id);
      updateDoc(docRef, {
        clicks: increment(1),
      }).catch(() => {});
    } catch (e) {}

    if (currentCampaign.targetUrl) {
      window.open(currentCampaign.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'movie':
        return <Film className="w-3.5 h-3.5" />;
      case 'merch':
        return <ShoppingBag className="w-3.5 h-3.5" />;
      case 'event':
        return <Calendar className="w-3.5 h-3.5" />;
      case 'deal':
        return <Tag className="w-3.5 h-3.5" />;
      default:
        return <Megaphone className="w-3.5 h-3.5" />;
    }
  };

  const badgeText = currentCampaign.badgeText || (
    currentCampaign.category === 'movie' ? 'MOVIE PREMIERE' :
    currentCampaign.category === 'merch' ? 'MERCH DROP' :
    currentCampaign.category === 'event' ? 'CAMPUS EVENT' :
    currentCampaign.category === 'deal' ? 'STUDENT DEAL' : 'CAMPUS SPOTLIGHT'
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className={`relative overflow-hidden border border-black dark:border-white bg-white dark:bg-zinc-950 p-4 sm:p-5 shadow-sm transition-all text-left ${className}`}
      >
        {/* Subtle top banner strip */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-1.5 px-2 py-0.5 border border-black dark:border-white bg-black/5 dark:bg-white/10 text-[10px] font-bold tracking-widest uppercase text-black dark:text-white">
            {getCategoryIcon(currentCampaign.category)}
            <span>{badgeText}</span>
          </div>

          <div className="flex items-center gap-2">
            {campaigns.length > 1 && (
              <span className="text-[10px] font-mono text-black/50 dark:text-white/50">
                {currentIndex + 1} / {campaigns.length}
              </span>
            )}
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Media image if present */}
          {currentCampaign.imageUrl && (
            <div className="relative w-full sm:w-28 h-32 sm:h-24 shrink-0 overflow-hidden border border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentCampaign.imageUrl}
                alt={currentCampaign.title}
                className="w-full h-full object-cover object-center"
              />
            </div>
          )}

          {/* Text details */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <h4 className="text-sm font-bold text-black dark:text-white tracking-tight leading-snug">
              {currentCampaign.title}
            </h4>
            <p className="text-xs text-black/70 dark:text-white/70 font-medium line-clamp-2">
              {currentCampaign.subtitle || currentCampaign.description}
            </p>
          </div>

          {/* CTA Action Button */}
          <div className="w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            <button
              onClick={handleActionClick}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer border border-black dark:border-white"
            >
              <span>{currentCampaign.ctaText || 'Learn More'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Next Campaign dot switcher */}
        {campaigns.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3 pt-2 border-t border-black/5 dark:border-white/5">
            {campaigns.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === currentIndex
                    ? 'w-5 bg-black dark:bg-white'
                    : 'w-1.5 bg-black/20 dark:bg-white/20 hover:bg-black/40'
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
