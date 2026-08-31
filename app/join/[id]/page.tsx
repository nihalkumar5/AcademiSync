'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Utensils, ArrowRight } from 'lucide-react';

export default function JoinMessPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { updateMessMenu, setActiveView, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messData, setMessData] = useState<any>(null);

  useEffect(() => {
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
        <h3 className="text-[18px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-1.5 flex items-center gap-2">
          <Utensils className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF]" />
          Hostel Mess Menu
        </h3>
        <p className="text-[13px] text-[#6F6F6F]">
          Breakfast · Lunch · Snacks · Dinner
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
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
    </div>
  );
}
