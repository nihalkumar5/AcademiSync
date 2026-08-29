const fs = require('fs');

const messViewContent = `'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MessOnboarding } from './MessOnboarding';
import { format } from 'date-fns';
import { Share, Sparkles, UserPlus, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
          timeLeft: h > 0 ? \`Ends in \${h}h \${m}m\` : \`Ends in \${m}m\`,
          items: items,
        });
        return;
      }

      let upcoming = parsedTimings.find(m => m.start > currentMins);
      if (upcoming) {
        const diff = upcoming.start - currentMins;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        const items = todayMenu?.[upcoming.name] || [];
        setTimeState({
          status: 'UPCOMING MEAL',
          meal: upcoming.name,
          timeLeft: h > 0 ? \`Starts in \${h}h \${m}m\` : \`Starts in \${m}m\`,
          items: items,
        });
        return;
      }

      const nextBreakfast = parsedTimings[0];
      const diff = (24 * 60 - currentMins) + nextBreakfast.start;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      setTimeState({
        status: 'NEXT MEAL TOMORROW',
        meal: 'Breakfast',
        timeLeft: \`Starts in \${h}h \${m}m\`,
        items: [],
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            )}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600 dark:bg-indigo-400"></span>
          </span>
          <span className="text-[11px] font-bold tracking-wider text-indigo-950 dark:text-indigo-200">
            {timeState.status}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-white/80 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-700/50">
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
  const [isImporting, setIsImporting] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  if (!messMenu || isImporting) {
    return <MessOnboarding onCancel={messMenu ? () => setIsImporting(false) : undefined} initialAction={isImporting ? 'import' : null} />;
  }

  const selectedMenu = messMenu.menu?.[selectedDay] || {};

  const handleCopyLink = () => {
    const url = \`\${window.location.origin}/join/\${messMenu.id}\`;
    navigator.clipboard.writeText(url);
    showToast('Copied', 'Invite link copied to clipboard!', 'success');
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let code = inviteInput.trim();
    if (!code) return;

    if (code.includes('/join/')) {
      code = code.split('/join/').pop()?.split('?')[0]?.split('#')[0] || code;
    }

    setIsJoining(true);
    try {
      const docRef = doc(db, 'messes', code);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const newMessData = docSnap.data();
        updateMessMenu(newMessData);
        setShowJoinModal(false);
        setInviteInput('');
        showToast('Joined Mess', 'Mess menu successfully updated!', 'success');
      } else {
        showToast('Invalid Code', 'Could not find a mess menu with this code.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Join Error', 'Failed to connect to mess service.', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-12 text-left">
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
            className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors gap-2 cursor-pointer"
          >
            <Share className="w-4 h-4" /> Share
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            Join Mess
          </button>
          <button
            onClick={() => setIsImporting(true)}
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
              className={\`flex flex-col items-center justify-center min-w-[70px] h-[60px] transition-all cursor-pointer shrink-0 \${
                isSelected 
                  ? 'bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 border border-indigo-600' 
                  : 'border border-[#D9D9D6] dark:border-[#333333] bg-transparent text-slate-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-800/50 rounded-none'
              }\`}
            >
              <span className="text-[12px] font-bold uppercase tracking-wider">{day.slice(0, 3)}</span>
              {isToday && (
                <span className={\`text-[10px] font-medium tracking-tight mt-0.5 \${isSelected ? 'text-indigo-200' : 'text-slate-400'}\`}>
                  TODAY
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MENU CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((meal) => {
          const items = selectedMenu[meal];
          if (!items || items.length === 0) return null;
          return (
            <div key={meal} className="flex flex-col p-5 border border-[#D9D9D6] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-[13px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF]">
                  {meal}
                </h4>
                <span className="text-[12px] text-[#A0A0A0] font-mono">
                  {mealTimings[meal]}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {items.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-[14px] text-[#6F6F6F] font-normal">
                    <span className="w-1.5 h-1.5 bg-[#111111] dark:bg-[#FFFFFF]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* JOIN MESS DIRECT MODAL */}
      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Join Another Mess Menu">
        <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4 text-left">
          <p className="text-[13px] text-[#6B6B6B]">
            Enter a mess invite code or paste an invite link to switch to that shared menu.
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="e.g., ext_... or 4-digit code"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#E5E5E5] dark:border-[#333333] bg-transparent text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
              required
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[13px] font-semibold text-[#111111] dark:text-[#FFFFFF] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isJoining}
              className="h-10 px-5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-semibold flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              {isJoining ? 'Joining...' : 'Join & Overwrite'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
`;

fs.writeFileSync('components/mess/MessView.tsx', messViewContent);
console.log('MessView.tsx updated successfully!');
