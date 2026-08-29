'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MessOnboarding } from './MessOnboarding';
import { format } from 'date-fns';
import { Share, Sparkles } from 'lucide-react';

const mealTimings: Record<string, string> = {
  Breakfast: '8:00 - 10:00',
  Lunch: '12:30 - 2:30',
  Snacks: '4:30 - 5:30',
  Dinner: '7:30 - 9:30',
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];


const parsedTimings = [
  { name: 'Breakfast', start: 8 * 60, end: 10 * 60 },
  { name: 'Lunch', start: 12 * 60 + 30, end: 14 * 60 + 30 },
  { name: 'Snacks', start: 16 * 60 + 30, end: 17 * 60 + 30 },
  { name: 'Dinner', start: 19 * 60 + 30, end: 21 * 60 + 30 },
];

const LiveMealCard = ({ todayMenu }: { todayMenu: any }) => {
  const [timeState, setTimeState] = React.useState<{ status: string; meal: string; timeLeft: string; items: string[] } | null>(null);

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      
      let serving = parsedTimings.find(m => currentMins >= m.start && currentMins < m.end);
      if (serving) {
        const diff = serving.end - currentMins;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        const items = todayMenu?.[serving.name] || [];
        setTimeState({
          status: 'SERVING NOW',
          meal: serving.name,
          timeLeft: `Ends in ${h > 0 ? `${h}h ` : ''}${m}m`,
          items: Array.isArray(items) ? items : (typeof items === 'string' ? [items] : [])
        });
        return;
      }
      
      let next = parsedTimings.find(m => m.start > currentMins);
      if (next) {
        const diff = next.start - currentMins;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        const items = todayMenu?.[next.name] || [];
        setTimeState({
          status: 'UP NEXT',
          meal: next.name,
          timeLeft: `Starts in ${h > 0 ? `${h}h ` : ''}${m}m`,
          items: Array.isArray(items) ? items : (typeof items === 'string' ? [items] : [])
        });
        return;
      }
      
      // Tomorrow's breakfast
      const diff = (24 * 60 - currentMins) + 8 * 60;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      setTimeState({
        status: 'UP NEXT (TOMORROW)',
        meal: 'Breakfast',
        timeLeft: `Starts in ${h > 0 ? `${h}h ` : ''}${m}m`,
        items: [] // Can't easily know tomorrow's menu here without passing full menu, keeping empty for simplicity
      });
    };
    
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [todayMenu]);

  if (!timeState) return null;

  return (
    <div className="flex flex-col p-5 bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800 rounded-2xl mb-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {timeState.status === 'SERVING NOW' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${timeState.status === 'SERVING NOW' ? 'bg-green-500' : 'bg-indigo-500'}`}></span>
          </span>
          <span className={`text-[11px] font-bold tracking-[1.5px] uppercase ${timeState.status === 'SERVING NOW' ? 'text-green-700 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
            {timeState.status}
          </span>
        </div>
        <span className="text-[12px] font-bold text-indigo-900 dark:text-indigo-100 bg-indigo-100 dark:bg-indigo-800/50 px-2 py-1 rounded-md">
          {timeState.timeLeft}
        </span>
      </div>
      <h3 className="text-[18px] font-bold text-indigo-950 dark:text-white mb-2">{timeState.meal}</h3>
      {timeState.items.length > 0 && (
        <p className="text-[14px] font-medium text-indigo-800/80 dark:text-indigo-200/80 leading-relaxed">
          {timeState.items.join(' · ')}
        </p>
      )}
    </div>
  );
};


export const MessView: React.FC = () => {
  const { messMenu, updateMessMenu, showToast } = useApp();
  
  const today = format(new Date(), 'EEEE');
  const [selectedDay, setSelectedDay] = useState(today);
  const [isReplacing, setIsReplacing] = useState<"join" | "import" | null>(null);

  if (!messMenu || isReplacing !== null) {
    return <MessOnboarding onCancel={messMenu ? () => setIsReplacing(null) : undefined} initialAction={isReplacing} />;
  }
  const selectedMenu = messMenu.menu?.[selectedDay] || {};

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
            onClick={() => setIsReplacing("join")}
            className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
          >
            Join Mess
          </button>
          <button
            onClick={() => setIsReplacing("import")}
            className="flex items-center justify-center h-10 px-4 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-semibold transition-colors gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Magic Import
          </button>
        </div>
      </div>

      <LiveMealCard todayMenu={messMenu.menu?.[today] || {}} />

      {/* DAY PICKER */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {days.map((day) => {
          const isSelected = selectedDay === day;
          const isToday = today === day;
          
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center justify-center min-w-[70px] h-[60px] transition-all cursor-pointer shrink-0 ${
                isSelected 
                  ? 'bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 border border-indigo-600' 
                  : 'border border-[#D9D9D6] dark:border-[#333333] bg-transparent text-slate-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-800/50 rounded-none'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold">{day.slice(0, 3)}</span>
                {isToday && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* SELECTED DAY MENU */}
      <div className="flex flex-col gap-6 mt-2">
        <h3 className="text-[20px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wide">
          {selectedDay.toUpperCase()}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
            const items = selectedMenu[meal];
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
          {Object.keys(selectedMenu).length === 0 && (
            <div className="col-span-full p-8 border border-dashed border-[#D8D8D8] dark:border-[#333333] text-center">
              <p className="text-[14px] text-[#6F6F6F]">No menu data available for {selectedDay}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
