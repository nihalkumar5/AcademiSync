'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MessOnboarding } from './MessOnboarding';
import { ChevronLeft, ChevronRight, Share } from 'lucide-react';

export const MessView: React.FC = () => {
  const { messMenu, updateMessMenu } = useApp();
  const [selectedDay, setSelectedDay] = useState(
    new Date().toLocaleDateString('en-US', { weekday: 'long' })
  );

  if (!messMenu) {
    return <MessOnboarding />;
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayMenu = messMenu.menu?.[selectedDay] || {};

  const handleCopyLink = () => {
    const url = `${window.location.origin}/join/${messMenu.id}`;
    navigator.clipboard.writeText(url);
    alert('Invite link copied!');
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-12">
      <div className="flex flex-col gap-4 pt-2 sm:pt-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
              Mess<br />Menu
            </h2>
            <p className="text-[14px] font-normal text-[#6F6F6F] leading-[20px] mt-4">
              Your weekly hostel dining schedule.
            </p>
          </div>
          <button 
            onClick={handleCopyLink}
            className="flex items-center justify-center p-2 border border-[#D8D8D8] dark:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors rounded-none"
            title="Share Invite Link"
          >
            <Share className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF]" />
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
        {days.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 text-[13px] font-medium tracking-wide rounded-none transition-colors whitespace-nowrap ${
              selectedDay === day 
                ? 'bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111]' 
                : 'bg-transparent border border-[#D8D8D8] dark:border-[#333333] text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF]'
            }`}
          >
            {day.substring(0, 3).toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
          const items = todayMenu[meal];
          if (!items || items.length === 0) return null;
          return (
            <div key={meal} className="border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] p-[20px] rounded-none">
              <h4 className="text-[12px] font-bold tracking-[1px] uppercase text-[#6F6F6F] mb-4 flex items-center gap-2">
                {meal}
              </h4>
              <div className="flex flex-col gap-2">
                {items.map((item: string, idx: number) => (
                  <p key={idx} className="text-[15px] font-medium text-[#111111] dark:text-[#FFFFFF] leading-snug">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
        {Object.keys(todayMenu).length === 0 && (
          <div className="col-span-1 md:col-span-2 p-8 border border-dashed border-[#D8D8D8] dark:border-[#333333] text-center">
            <p className="text-[14px] text-[#6F6F6F]">No menu data available for {selectedDay}.</p>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-[#D8D8D8] dark:border-[#333333] pt-6 flex justify-between items-center">
        <span className="text-[12px] text-[#A0A0A0] font-mono">ID: {messMenu.id}</span>
        <button 
          onClick={() => {
            if (confirm('Are you sure you want to leave this mess?')) {
              updateMessMenu(null);
            }
          }}
          className="text-[12px] font-medium text-red-500 hover:underline"
        >
          Leave Mess
        </button>
      </div>
    </div>
  );
};
