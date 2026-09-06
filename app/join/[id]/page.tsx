'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Utensils, ArrowRight, Download, Copy, ExternalLink } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export default function JoinMessPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { updateMessMenu, setActiveView, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messData, setMessData] = useState<any>(null);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    const fetchMess = async () => {
      try {
        const docRef = doc(db, 'messes', params.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setMessData(docSnap.data());
        } else {
          setError('Invalid or expired mess invite link.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch mess data.');
      } finally {
        setLoading(false);
      }
    };
    fetchMess();
  }, [params.id]);

  const handleJoin = () => {
    if (messData) {
      updateMessMenu(messData);
      setActiveView('mess');
      showToast('Joined Mess', 'Hostel mess menu successfully loaded into your app!', 'success');
      router.push('/');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(params.id);
    showToast('Code Copied', `Invite code ${params.id} copied to clipboard!`, 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF8] dark:bg-[#111110]">
        <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAF8] dark:bg-[#111110] p-6 text-center">
        <h2 className="text-[24px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-2">Error</h2>
        <p className="text-[#6F6F6F] mb-6 text-[14px]">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="px-6 py-2.5 bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] text-[12px] font-bold uppercase tracking-wider cursor-pointer"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-start pt-16 sm:pt-20 min-h-screen bg-[#FAFAF8] dark:bg-[#111110] p-6 text-left max-w-md mx-auto w-full font-sans">
      <div className="mb-6">
        <h2 className="text-[36px] sm:text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[40px] sm:leading-[44px]">
          Join,<br />
          Hostel,<br />
          Mess,<br />
          Menu
        </h2>
        <p className="text-[#6B6B6B] text-[14px] leading-[20px] mt-4 max-w-[320px]">
          Sync your hostel&apos;s live meal countdowns, daily dishes &amp; serving hours.
        </p>
      </div>

      <div className="border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] p-6 w-full mb-6 text-left shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold tracking-widest text-[#A0A0A0] uppercase">INVITE CODE: {params.id}</p>
          <button
            type="button"
            onClick={copyCode}
            className="text-[11px] font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </button>
        </div>
        <h3 className="text-[18px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-1.5 flex items-center gap-2">
          <Utensils className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF]" />
          Hostel Mess Menu
        </h3>
        <p className="text-[13px] text-[#6F6F6F]">
          Breakfast · Lunch · Snacks · Dinner
        </p>
      </div>

      {isNative ? (
        /* Native App Flow */
        <div className="flex flex-col gap-3 w-full">
          <button
            type="button"
            onClick={handleJoin}
            className="w-full h-12 bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] text-[13px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <span>Join Mess Menu</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button 
            type="button"
            onClick={() => router.push('/')}
            className="mt-2 text-[13px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors text-center cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        /* Web Flow -> Strictly Mobile App Only */
        <div className="flex flex-col gap-4 w-full">
          <div className="p-3.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col gap-1.5 text-xs text-black/80 dark:text-white/80">
            <span className="font-bold text-[11px] uppercase tracking-wider text-black dark:text-white">
              App Only Feature:
            </span>
            <p className="text-[12px] opacity-90 leading-relaxed">
              Mess menu sync is available exclusively in the <strong>Intersemester</strong> mobile app.
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[12px] opacity-90 mt-1">
              <li>Download Intersemester from Google Play.</li>
              <li>Open the app and navigate to the <strong>Mess</strong> tab.</li>
              <li>Import menu using code: <strong className="font-mono">{params.id}</strong></li>
            </ol>
          </div>

          <a
            href={`intent://invite?mess_id=${params.id}#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.intersemester.app')};end`}
            className="w-full h-12 bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] text-[13px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <span>Open in Intersemester App</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <a
            href="https://play.google.com/store/apps/details?id=com.intersemester.app"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 border border-black dark:border-white text-black dark:text-white text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download on Google Play</span>
          </a>

          <button 
            type="button"
            onClick={() => router.push('/')}
            className="mt-1 text-[13px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors text-center cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      )}
    </div>
  );
}
