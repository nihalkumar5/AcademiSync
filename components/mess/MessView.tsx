'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MessOnboarding } from './MessOnboarding';
import { format } from 'date-fns';
import { Share } from 'lucide-react';

const mealTimings: Record<string, string> = {
  Breakfast: '8:00 - 10:00',
  Lunch: '12:30 - 2:30',
  Snacks: '4:30 - 5:30',
  Dinner: '7:30 - 9:30',
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const MessView: React.FC = () => {
  const { messMenu, updateMessMenu, showToast } = useApp();
  
  if (!messMenu) {
    return <MessOnboarding />;
  }

  const today = format(new Date(), 'EEEE');
  const dayShort = format(new Date(), 'EEE');
  const dateFormatted = format(new Date(), 'MMM d');
  const todayMenu = messMenu.menu?.[today] || {};

  const handleCopyLink = () => {
    const url = `${window.location.origin}/join/${messMenu.id}`;
    navigator.clipboard.writeText(url);
    showToast('Copied', 'Invite link copied to clipboard!', 'success');
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-12">
      <div className="flex flex-col items-start pt-2 sm:pt-6 mb-4">
        <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
          Hostel,<br />
          Mess,<br />
          Weekly,<br />
          Menu
        </h2>
        <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4">
          Your complete week's dining schedule.
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-8">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors gap-2"
          >
            <Share className="w-4 h-4" /> Share
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to leave this mess?')) {
                updateMessMenu(null);
              }
            }}
            className="flex items-center justify-center h-10 px-4 bg-[#FF3333]/10 text-[#FF3333] text-[13px] font-semibold hover:bg-[#FF3333]/20 transition-colors gap-2 cursor-pointer"
          >
            Leave Mess
          </button>
        </div>
      </div>

      {/* TODAY SECTION */}
      <div className="mt-4 mb-2">
        <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-1">
          TODAY
        </p>
        <h3 className="text-[20px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wide">
          {dayShort} · {dateFormatted}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
          const items = todayMenu[meal];
          if (!items || items.length === 0) return null;
          return (
            <div key={meal} className="flex flex-col p-5 border border-[#D9D9D6] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-[13px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF]">
                  {meal}
                </h4>
                <p className="text-[10px] font-mono text-[#A0A0A0] px-2 py-1 bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#333333]">
                  {mealTimings[meal]}
                </p>
              </div>
              <p className="text-[15px] font-medium text-[#111111] dark:text-[#FFFFFF] leading-relaxed">
                {Array.isArray(items) ? items.join(' · ') : items}
              </p>
            </div>
          );
        })}
        {Object.keys(todayMenu).length === 0 && (
          <div className="col-span-full p-8 border border-dashed border-[#D8D8D8] dark:border-[#333333] text-center">
            <p className="text-[14px] text-[#6F6F6F]">No menu data available for today.</p>
          </div>
        )}
      </div>

      {/* FULL WEEK SECTION */}
      <div className="mt-12 border-t border-[#D8D8D8] dark:border-[#333333] pt-12">
        <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-8">
          THIS WEEK
        </p>

        <div className="flex flex-col gap-10">
          {days.map(day => {
            // Skip today as it's already shown above
            if (day === today) return null;
            
            const dayMenu = messMenu.menu?.[day];
            if (!dayMenu) return null;
            
            return (
              <div key={day} className="flex flex-col">
                <h3 className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-4 uppercase tracking-widest">{day}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
                    const items = dayMenu[meal];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={meal}>
                        <h4 className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#6F6F6F] mb-1">{meal}</h4>
                        <p className="text-[11px] font-mono text-[#A0A0A0] mb-2">{mealTimings[meal]}</p>
                        <p className="text-[14px] text-[#111111] dark:text-[#FFFFFF] leading-snug">{Array.isArray(items) ? items.join(' · ') : items}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
