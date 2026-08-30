'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';
import { Smartphone } from 'lucide-react';

export default function JoinMessPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { updateMessMenu, setActiveView, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messData, setMessData] = useState<any>(null);
  const [isMobileBrowser, setIsMobileBrowser] = useState(false);

  useEffect(() => {
    // Check if on mobile browser
    if (typeof window !== 'undefined') {
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isNative = (window as any)?.Capacitor?.isNativePlatform?.();
      if (isAndroid && !isNative) {
        setIsMobileBrowser(true);
      }
    }

    const fetchMess = async () => {
      try {
        const docRef = doc(db, 'messes', params.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setMessData(docSnap.data());
        } else {
          setError('Invalid or expired invite link.');
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
      showToast('Joined Mess', 'Mess menu successfully loaded into your app!', 'success');
      router.push('/');
    }
  };

  const handleOpenApp = () => {
    if (typeof window !== 'undefined') {
      const host = window.location.host || 'academi-sync-chi.vercel.app';
      const intentUrl = `intent://${host}/join/${params.id}#Intent;scheme=https;package=com.intersemester.app;end`;
      window.location.href = intentUrl;
    }
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
        <h2 className="text-[24px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-4">Error</h2>
        <p className="text-[#6F6F6F] mb-8">{error}</p>
        <Button onClick={() => router.push('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-start pt-20 min-h-screen bg-[#FAFAF8] dark:bg-[#111110] p-6 text-left max-w-sm mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
          Join,<br />
          Hostel,<br />
          Mess,<br />
          Menu
        </h2>
        <p className="text-[#6B6B6B] text-[14px] leading-[20px] mt-4 max-w-[280px]">
          Sync your hostel's live meal countdowns, daily dishes & serving hours.
        </p>
      </div>

      <div className="border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] p-6 w-full max-w-sm mb-6 text-left shadow-sm">
        <p className="text-[11px] font-bold tracking-widest text-[#A0A0A0] uppercase mb-2">INVITE CODE: {params.id}</p>
        <h3 className="text-[18px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-1.5">
          Hostel Mess Menu
        </h3>
        <p className="text-[13px] text-[#6F6F6F]">
          Breakfast · Lunch · Snacks · Dinner
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        {isMobileBrowser && (
          <button
            type="button"
            onClick={handleOpenApp}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
          >
            <Smartphone className="w-4 h-4" /> Open in Android App
          </button>
        )}

        <Button onClick={handleJoin} className="w-full h-12 text-[14px]">
          Join on Web
        </Button>

        <button 
          onClick={() => router.push('/')}
          className="mt-2 text-[14px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors text-center"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
