'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';

export default function JoinMessPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { updateMessMenu, setActiveView } = useApp();
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
    updateMessMenu(messData);
    setActiveView('mess');
    router.push('/');
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
    <div className="flex flex-col justify-center min-h-screen bg-[#FAFAF8] dark:bg-[#111110] p-6 text-left max-w-sm mx-auto w-full">
      <div className="mb-12">
        <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
          Join,<br />
          Hostel,<br />
          Mess,<br />
          Menu
        </h2>
        <p className="text-[#6B6B6B] text-[14px] leading-[20px] mt-4 max-w-[280px]">
          You'll get the current menu and meal timings.
        </p>
      </div>

      <div className="border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] p-6 w-full max-w-sm mb-8 text-left">
        <p className="text-[12px] text-[#A0A0A0] font-mono mb-2">MESS ID: {params.id}</p>
        <h3 className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-2">
          Hostel Mess Menu
        </h3>
        <p className="text-[13px] text-[#6F6F6F]">
          Breakfast · Lunch · Snacks · Dinner
        </p>
      </div>

      <Button onClick={handleJoin} className="w-full max-w-sm h-12 text-[14px] mb-4">
        Join Mess
      </Button>
      <button 
        onClick={() => router.push('/')}
        className="text-[14px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
