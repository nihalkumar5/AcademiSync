'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MessOnboarding } from './MessOnboarding';
import { ArrowRight, Share } from 'lucide-react';
import { Button } from '../ui/Button';

export const MessView: React.FC = () => {
  const { messMenu, updateMessMenu } = useApp();
  const [showThisWeek, setShowThisWeek] = useState(false);
  
  if (!messMenu) {
    return <MessOnboarding />;
  }

  const todayDate = new Date();
  const currentDay = todayDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dateFormatted = todayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();
  const dayShort = currentDay.substring(0, 3).toUpperCase();

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Hardcoded standard hostel timings as fallback/display
  const mealTimings: Record<string, string> = {
    'Breakfast': '8:00 — 10:00',
    'Lunch': '12:30 — 2:30',
    'Snacks': '4:30 — 5:30',
    'Dinner': '7:30 — 9:30'
  };

  const handleCopyLink = () => {
    const url = window.location.origin + '/join/' + messMenu.id;
    navigator.clipboard.writeText(url);
    alert('Invite link copied!');
  };

  if (showThisWeek) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-12">
        <div className="flex justify-between items-start pt-2 sm:pt-6 mb-4">
          <div>
            <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
            This,<br />
            Week,<br />
            All,<br />
            Meals
          </h2>
          <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4">
            Your complete week's dining schedule.
          </p>
          </div>
          <button 
            onClick={() => setShowThisWeek(false)}
            className="text-[13px] font-bold tracking-wider uppercase text-[#111111] dark:text-[#FFFFFF] hover:opacity-70 flex items-center gap-1"
          >
            ← BACK
          </button>
        </div>

        <div className="flex flex-col gap-8">
          {days.map(day => {
            const dayMenu = messMenu.menu?.[day];
            if (!dayMenu) return null;
            return (
              <div key={day} className="border-t border-[#D8D8D8] dark:border-[#333333] pt-6">
                <h3 className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-4 uppercase tracking-widest">{day}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
                    const items = dayMenu[meal];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={meal}>
                        <h4 className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#6F6F6F] mb-1">{meal}</h4>
                        <p className="text-[11px] font-mono text-[#A0A0A0] mb-2">{mealTimings[meal]}</p>
                        <p className="text-[14px] text-[#111111] dark:text-[#FFFFFF] leading-snug">{items.join(' · ')}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const todayMenu = messMenu.menu?.[currentDay] || {};

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-12">
      <div className="flex justify-between items-start pt-2 sm:pt-6">
        <div>
          <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
            Hostel,<br />
            Mess,<br />
            Weekly,<br />
            Menu
          </h2>
          <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4">
            Manage your daily hostel dining schedule.
          </p>
        </div>
        <button 
          onClick={() => setShowThisWeek(true)}
          className="text-[13px] font-bold tracking-wider uppercase text-[#111111] dark:text-[#FFFFFF] hover:opacity-70 flex items-center gap-1"
        >
          THIS WEEK <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-4 mb-2">
        <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-1">
          TODAY
        </p>
        <h3 className="text-[20px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wide">
          {dayShort} · {dateFormatted}
        </h3>
      </div>

      <div className="flex flex-col gap-6">
        {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
          const items = todayMenu[meal];
          if (!items || items.length === 0) return null;
          return (
            <div key={meal} className="flex flex-col">
              <h4 className="text-[13px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] mb-0.5">
                {meal}
              </h4>
              <p className="text-[12px] font-mono text-[#A0A0A0] mb-2">
                {mealTimings[meal]}
              </p>
              <p className="text-[15px] text-[#111111] dark:text-[#FFFFFF] leading-relaxed">
                {items.join(' · ')}
              </p>
            </div>
          );
        })}
        {Object.keys(todayMenu).length === 0 && (
          <div className="p-8 border border-dashed border-[#D8D8D8] dark:border-[#333333] text-center">
            <p className="text-[14px] text-[#6F6F6F]">No menu data available for today.</p>
          </div>
        )}
      </div>

      {/* Share Section */}
      <div className="mt-12 border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A] p-6 rounded-none">
        <h3 className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-2">
          Share this mess
        </h3>
        <p className="text-[14px] text-[#6F6F6F] mb-6">
          Anyone in your hostel can join using this link.
        </p>
        <Button onClick={handleCopyLink} className="w-full flex justify-center items-center gap-2 h-12 text-[14px]">
          <Share className="w-4 h-4" /> Share invite
        </Button>
      </div>

      <div className="mt-4 flex justify-between items-center">
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
