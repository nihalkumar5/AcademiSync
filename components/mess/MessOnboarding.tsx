'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ArrowRight, CheckCircle2, Image as ImageIcon, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '../ui/Button';

export const MessOnboarding: React.FC = () => {
  const { setActiveView, updateMessMenu } = useApp();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [messId, setMessId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type.startsWith('image/')) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setStep(2);
      processMenu(selected);
    } else {
      alert('Please upload an image file (JPG, PNG)');
    }
  };

  const processMenu = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);

    // Simulate progress animation while API runs
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return 90;
        return p + Math.random() * 10;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/extract-mess', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      clearInterval(interval);
      setProgress(100);

      setTimeout(() => {
        if (data.success && data.data) {
          setExtractedData(data.data);
          setStep(3);
        } else {
          alert('Failed to parse menu: ' + (data.error || 'Unknown error'));
          setStep(1);
        }
        setIsProcessing(false);
      }, 500);

    } catch (error) {
      console.error(error);
      clearInterval(interval);
      alert('Error extracting menu');
      setStep(1);
      setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    const newId = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const messDoc = {
      id: newId,
      createdAt: new Date().toISOString(),
      menu: extractedData,
    };

    try {
      await setDoc(doc(db, 'messes', newId), messDoc);
      setMessId(newId);
      updateMessMenu(messDoc);
      setStep(4);
    } catch (e) {
      console.error('Failed to publish', e);
      alert('Failed to publish mess. Make sure Firebase is configured.');
    }
  };

  const [copying, setCopying] = useState(false);
  const handleCopyLink = () => {
    const url = `${window.location.origin}/join/${messId}`;
    navigator.clipboard.writeText(url);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  return (
    <div className="flex flex-col max-w-lg mx-auto w-full pt-8 pb-12 px-4 h-[calc(100vh-80px)]">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-6">
              MESS
            </p>
            <h2 className="text-[32px] font-medium leading-[1.1] text-[#111111] dark:text-[#FFFFFF] mb-4">
              Your mess, sorted.
            </h2>
            <p className="text-[#6F6F6F] text-[14px] leading-relaxed mb-8 max-w-[280px]">
              Upload the weekly menu once. We'll organise meals, timings and days automatically.
            </p>

            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#D8D8D8] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] bg-[#F7F7F5] dark:bg-[#1A1A1A] transition-colors cursor-pointer"
            >
              <Upload className="w-6 h-6 mb-3 text-[#111111] dark:text-[#FFFFFF]" />
              <span className="text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] mb-1">
                Upload weekly menu
              </span>
              <span className="text-[12px] text-[#6F6F6F]">
                Photo or PDF
              </span>
            </button>
            
            <div className="mt-8 pt-6 border-t border-[#D8D8D8] dark:border-[#333333] w-full max-w-[280px]">
              <p className="text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF] mb-1">AI will organise</p>
              <p className="text-[12px] text-[#6F6F6F]">Breakfast · Lunch · Snacks · Dinner</p>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col justify-center h-full max-w-sm mx-auto w-full"
          >
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-10 text-center">
              READING YOUR MENU
            </p>

            <div className="flex flex-col gap-5 mb-12">
              <div className="flex items-center gap-3">
                {progress > 20 ? <CheckCircle2 className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF]" /> : <div className="w-5 h-5 rounded-full border-2 border-[#D8D8D8] dark:border-[#333333]" />}
                <span className={`text-[16px] font-medium ${progress > 20 ? 'text-[#111111] dark:text-[#FFFFFF]' : 'text-[#A0A0A0]'}`}>Finding days</span>
              </div>
              <div className="flex items-center gap-3">
                {progress > 40 ? <CheckCircle2 className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF]" /> : <div className="w-5 h-5 rounded-full border-2 border-[#D8D8D8] dark:border-[#333333]" />}
                <span className={`text-[16px] font-medium ${progress > 40 ? 'text-[#111111] dark:text-[#FFFFFF]' : 'text-[#A0A0A0]'}`}>Detecting meals</span>
              </div>
              <div className="flex items-center gap-3">
                {progress > 60 ? <CheckCircle2 className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF]" /> : <div className="w-5 h-5 rounded-full border-2 border-[#D8D8D8] dark:border-[#333333]" />}
                <span className={`text-[16px] font-medium ${progress > 60 ? 'text-[#111111] dark:text-[#FFFFFF]' : 'text-[#A0A0A0]'}`}>Reading dishes</span>
              </div>
              <div className="flex items-center gap-3">
                {progress > 80 ? <CheckCircle2 className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF]" /> : <div className="w-5 h-5 rounded-full border-2 border-[#D8D8D8] dark:border-[#333333]" />}
                <span className={`text-[16px] font-medium ${progress > 80 ? 'text-[#111111] dark:text-[#FFFFFF]' : 'text-[#A0A0A0]'}`}>Matching timings</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-1 bg-[#F7F7F5] dark:bg-[#1A1A1A] flex-1 overflow-hidden">
                <motion.div 
                  className="h-full bg-[#111111] dark:bg-[#FFFFFF]" 
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[12px] font-mono text-[#6F6F6F]">
                {Math.floor(progress)}%
              </span>
            </div>
          </motion.div>
        )}

        {step === 3 && extractedData && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col h-full py-4"
          >
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-6 text-center">
              YOUR MENU IS READY
            </p>

            <div className="flex-1 overflow-y-auto mb-8 pr-2">
              <div className="bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] p-6">
                <h3 className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-6 border-b border-[#D8D8D8] dark:border-[#333333] pb-2">
                  MONDAY
                </h3>
                
                {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
                  const items = extractedData.Monday?.[meal];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={meal} className="mb-6 last:mb-0">
                      <h4 className="text-[12px] font-bold tracking-[1px] uppercase text-[#6F6F6F] mb-2">
                        {meal}
                      </h4>
                      <p className="text-[15px] text-[#111111] dark:text-[#FFFFFF] leading-relaxed">
                        {items.join(' · ')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handlePublish} className="w-full flex justify-center items-center gap-2 h-12 text-[14px]">
                Looks good <ArrowRight className="w-4 h-4" />
              </Button>
              <button 
                onClick={() => alert('Edit mode would open here')}
                className="w-full h-12 border border-[#D8D8D8] dark:border-[#333333] text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
              >
                Edit menu
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-6">
              YOUR MESS IS READY 🎉
            </p>
            <h2 className="text-[32px] font-medium leading-[1.1] text-[#111111] dark:text-[#FFFFFF] mb-4">
              Share this link with your hostel mates.
            </h2>
            <p className="text-[#6F6F6F] text-[14px] mb-8">
              Anyone with this link can join.
            </p>

            <div className="flex items-center justify-between w-full p-4 border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A] mb-6">
              <span className="text-[15px] font-medium text-[#111111] dark:text-[#FFFFFF] truncate mr-4">
                intersemester.app/join/{messId}
              </span>
            </div>

            <Button onClick={handleCopyLink} className="w-full h-12 text-[14px] flex items-center justify-center gap-2">
              {copying ? <><Check className="w-4 h-4" /> Copied</> : 'Copy invite link'}
            </Button>

            <button
              onClick={() => setActiveView('mess')}
              className="mt-6 text-[14px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] underline underline-offset-4"
            >
              Go to my mess menu
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
