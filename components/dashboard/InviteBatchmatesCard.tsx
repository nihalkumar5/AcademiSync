'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

import { useApp } from '@/context/AppContext';

export const InviteBatchmatesCard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { profile, showToast } = useApp();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('dismissed_invite_card');
      if (!dismissed) {
        setIsVisible(true);
      }
    }
  }, []);

  // If user is not in a batch, or we already closed it, don't show
  if (!isVisible || !profile?.isBatchSynced) return null;

  const handleInvite = async () => {
    if (!profile?.batchKey) return;
    
    const inviteUrl = `${window.location.origin}/?invite=${profile.batchKey}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join our Batch Timetable',
          text: 'Join our class batch on AcademiSync to sync the timetable, exams, and shared homework!',
          url: inviteUrl,
        });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        showToast('Link Copied', 'Batch invite link copied to clipboard.', 'success');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('dismissed_invite_card', 'true');
  };

  return (
    <div className="relative bg-[#F4F4F4] p-4 sm:p-5 border border-[#D9D9D6] flex items-center justify-between overflow-hidden min-h-[140px]">
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-2 text-[#6F6F6F] hover:text-[#111111] transition-colors z-20"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col gap-3 max-w-[65%] sm:max-w-[70%] relative z-10">
        <div className="flex flex-col gap-1">
          <h3 className="text-[16px] font-bold text-[#111111] tracking-tight">Invite your classmates</h3>
          <p className="text-[12px] text-[#6F6F6F] leading-tight pr-2">
            Keep everyone on the same timetable and tasks.
          </p>
        </div>
        
        <button
          onClick={handleInvite}
          className="self-start mt-1 px-4 py-2 bg-[#111111] text-[#FFFFFF] text-[11px] font-bold tracking-[1px] uppercase transition-opacity hover:opacity-90 rounded-none"
        >
          Invite classmates
        </button>
      </div>

      <div className="absolute right-0 bottom-0 z-0 flex items-end justify-end h-[100%] pr-0">
        <img src="/invite2.png" alt="Invite illustration" className="w-[180px] sm:w-[210px] h-[150px] sm:h-[160px] object-contain object-bottom translate-y-[15%] translate-x-[8%]" />
      </div>
    </div>
  );
};
