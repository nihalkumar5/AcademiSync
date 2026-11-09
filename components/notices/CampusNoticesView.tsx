'use client';

import React, { useEffect, useState } from 'react';
import { collection, doc, increment, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PromotionalCampaign } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { Illustration } from '@/components/ui/Illustration';
import { SpotlightCardView, isCampaignRunning, matchesAudience } from '@/components/ads/CampusSpotlightCard';

// Every live notice from your campus admin (and app-wide ones), newest first.
// Home shows one rotating card; this is the full list so nothing is missed.
export const CampusNoticesView: React.FC = () => {
  const { profile } = useApp();
  const [notices, setNotices] = useState<PromotionalCampaign[] | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'promotional_campaigns'), where('isActive', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: PromotionalCampaign[] = [];
        snap.forEach((d) => {
          const data = { ...(d.data() as PromotionalCampaign), id: d.id };
          if (isCampaignRunning(data) && matchesAudience(data, profile)) list.push(data);
        });
        list.sort((a, b) => String((b as any).createdAt || '').localeCompare(String((a as any).createdAt || '')));
        setNotices(list);
      },
      () => setNotices([])
    );
    return () => unsub();
  }, [profile.college, profile.branch, profile.semester]);

  const open = (n: PromotionalCampaign) => {
    updateDoc(doc(db, 'promotional_campaigns', n.id), { clicks: increment(1) }).catch(() => {});
    if (n.targetUrl) window.open(n.targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col gap-f5 pb-f6">
      <header>
        <h1 className="page-title">Campus notices</h1>
        <p className="mt-2 text-[15px] text-muted">
          {profile?.college ? `Events, deadlines and offers at ${profile.college}.` : 'Events, deadlines and offers from your campus.'}
        </p>
      </header>

      {notices === null ? (
        <div className="flex flex-col gap-f3" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-[180px] border border-line bg-surface-2 animate-pulse" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <section className="border border-dashed border-line px-6 py-10 flex flex-col items-center text-center">
          <Illustration name="notifications" className="h-[160px] w-auto" />
          <h3 className="mt-f4 text-[17px] font-semibold text-fg">No notices right now</h3>
          <p className="mt-1.5 text-[14px] text-muted max-w-[300px]">
            When your campus posts an event, deadline or offer, it shows up here and you get a notification.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-f3">
          {notices.map((n) => (
            <SpotlightCardView key={n.id} campaign={n} onAction={n.targetUrl ? () => open(n) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
};
