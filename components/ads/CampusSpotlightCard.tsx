'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { collection, onSnapshot, query, where, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PromotionalCampaign, CampaignCategory } from '@/lib/types';
import { collegeKeyOf } from '@/lib/collegeKey';
import { useApp } from '@/context/AppContext';
import { ArrowUpRight, X, Film, ShoppingBag, Calendar, Tag, Megaphone } from '@/components/ui/icons';

// ---------- Shared presentation (used by the student card and the admin live preview) ----------

export const CAMPAIGN_CATEGORIES: { id: CampaignCategory; label: string; badge: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'Spotlight', badge: 'Campus spotlight', icon: Megaphone },
  { id: 'event', label: 'Event', badge: 'Campus event', icon: Calendar },
  { id: 'deal', label: 'Deal', badge: 'Student deal', icon: Tag },
  { id: 'merch', label: 'Merch', badge: 'Merch drop', icon: ShoppingBag },
  { id: 'movie', label: 'Movie', badge: 'Movie premiere', icon: Film },
];

export const getCategoryMeta = (category?: string) =>
  CAMPAIGN_CATEGORIES.find((c) => c.id === category) || CAMPAIGN_CATEGORIES[0];

/** A campaign is shown only while it is switched on and not past its end date. */
export const isCampaignRunning = (c: Pick<PromotionalCampaign, 'isActive' | 'expiresAt'>, now = Date.now()) =>
  !!c.isActive && (!c.expiresAt || new Date(c.expiresAt).getTime() > now);

export interface SpotlightCardViewProps {
  campaign: Pick<PromotionalCampaign, 'title' | 'subtitle' | 'description' | 'imageUrl' | 'ctaText' | 'category' | 'badgeText'>;
  onAction?: () => void;
  onDismiss?: () => void;
  index?: number;
  total?: number;
  onSelect?: (i: number) => void;
  className?: string;
}

export const SpotlightCardView: React.FC<SpotlightCardViewProps> = ({
  campaign,
  onAction,
  onDismiss,
  index = 0,
  total = 1,
  onSelect,
  className = '',
}) => {
  const meta = getCategoryMeta(campaign.category);
  const Icon = meta.icon;
  const badge = campaign.badgeText?.trim() || meta.badge;
  const body = campaign.subtitle || campaign.description;

  return (
    <div className={`relative overflow-hidden border border-line bg-surface text-left ${className}`}>
      {campaign.imageUrl && (
        <div className="relative w-full aspect-[16/7] bg-[#F1F1EF] dark:bg-white/[0.04] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={campaign.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-f4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted">
            <Icon className="w-3.5 h-3.5" />
            {badge}
            <span aria-hidden="true">·</span>
            <span>Sponsored</span>
          </span>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="-m-1.5 p-1.5 text-[#8A8A8A] hover:text-fg transition-colors cursor-pointer"
              aria-label="Hide this"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <h4 className="mt-2 text-[17px] font-semibold leading-snug text-fg break-words">
          {campaign.title || 'Your headline'}
        </h4>
        {body && <p className="mt-1 text-[14px] leading-relaxed text-muted line-clamp-2">{body}</p>}
        <div className="mt-f3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onAction}
            className="btn btn-primary"
          >
            {campaign.ctaText?.trim() || 'Learn more'}
            <ArrowUpRight className="w-4 h-4" />
          </button>
          {total > 1 && (
            <div className="flex items-center gap-1.5" role="tablist" aria-label="More from campus">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Item ${i + 1} of ${total}`}
                  onClick={() => onSelect?.(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === index ? 'w-5 bg-ink' : 'w-1.5 bg-black/20 dark:bg-white/20'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- Student-facing card (data + tracking) ----------

interface CampusSpotlightCardProps {
  placement?: 'home' | 'timetable' | 'calendar';
  className?: string;
}

export const matchesAudience = (data: PromotionalCampaign, profile: { college?: string; branch?: string; semester?: number }) => {
  if (data.targetAudienceType === 'all') return true;
  // Campus-admin notices carry exact college keys; a student outside that college never sees them
  const keys = Array.isArray(data.targetCollegeKeys) ? data.targetCollegeKeys.filter(Boolean) : [];
  if (keys.length > 0 && !keys.includes(collegeKeyOf(profile.college))) return false;
  const userCollege = (profile.college || '').toLowerCase().trim();
  const userBranch = (profile.branch || '').toLowerCase().trim();
  const colleges = Array.isArray(data.targetColleges) ? data.targetColleges : [];
  const branches = Array.isArray(data.targetBranches) ? data.targetBranches : [];
  const sems = Array.isArray(data.targetSemesters) ? data.targetSemesters : [];
  const collegeMatch =
    keys.length > 0 ||
    colleges.length === 0 ||
    (!!userCollege &&
      colleges.some((c) => typeof c === 'string' && (userCollege.includes(c.toLowerCase().trim()) || c.toLowerCase().trim().includes(userCollege))));
  const branchMatch =
    branches.length === 0 ||
    (!!userBranch &&
      branches.some((b) => typeof b === 'string' && (userBranch.includes(b.toLowerCase().trim()) || b.toLowerCase().trim().includes(userBranch))));
  const semMatch = sems.length === 0 || (!!profile.semester && sems.includes(profile.semester));
  return collegeMatch && branchMatch && semMatch;
};

export const CampusSpotlightCard: React.FC<CampusSpotlightCardProps> = ({ className = '' }) => {
  const { profile } = useApp();
  const [campaigns, setCampaigns] = useState<PromotionalCampaign[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const trackedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const q = query(collection(db, 'promotional_campaigns'), where('isActive', '==', true));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: PromotionalCampaign[] = [];
          snapshot.forEach((docSnap) => {
            const data = { ...(docSnap.data() as PromotionalCampaign), id: docSnap.id };
            if (isCampaignRunning(data) && matchesAudience(data, profile)) fetched.push(data);
          });
          setCampaigns(fetched);
          setCurrentIndex((i) => (i < fetched.length ? i : 0));
        },
        (err) => console.error('Error fetching campaigns:', err)
      );
      return () => unsubscribe();
    } catch (e) {
      console.error('Campaign listener error:', e);
    }
  }, [profile.college, profile.branch, profile.semester]);

  const currentCampaign = campaigns[currentIndex];

  // One impression per campaign per session
  useEffect(() => {
    if (currentCampaign && !trackedImpressions.current.has(currentCampaign.id)) {
      trackedImpressions.current.add(currentCampaign.id);
      updateDoc(doc(db, 'promotional_campaigns', currentCampaign.id), { impressions: increment(1) }).catch(() => {});
    }
  }, [currentCampaign]);

  if (profile?.isPro || isDismissed || !currentCampaign) return null;

  const handleActionClick = () => {
    updateDoc(doc(db, 'promotional_campaigns', currentCampaign.id), { clicks: increment(1) }).catch(() => {});
    if (currentCampaign.targetUrl) window.open(currentCampaign.targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={className}>
      <SpotlightCardView
        campaign={currentCampaign}
        onAction={handleActionClick}
        onDismiss={() => setIsDismissed(true)}
        index={currentIndex}
        total={campaigns.length}
        onSelect={setCurrentIndex}
      />
    </motion.div>
  );
};
