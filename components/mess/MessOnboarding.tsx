'use client';

import { shareLink } from '@/lib/shareUtils';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, X, ArrowRight, CheckCircle2, Image as ImageIcon, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MessImportModal } from './MessImportModal';

export const MessOnboarding: React.FC<{ onCancel?: () => void; initialAction?: 'join' | 'import' | null }> = ({ onCancel, initialAction }) => {
  const { setActiveView, updateMessMenu, showToast, user } = useApp();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [showJoinInput, setShowJoinInput] = useState(initialAction === "join");
  const [inviteInput, setInviteInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showImportModal, setShowImportModal] = useState(initialAction === "import");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extractedTimings, setExtractedTimings] = useState<Record<string, string>>({
    Breakfast: '8:00 - 10:00',
    Lunch: '12:30 - 2:30',
    Snacks: '4:30 - 5:30',
    Dinner: '7:30 - 9:30',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [messId, setMessId] = useState<string>('');

  const handleModalFileSelect = async (selected: { name: string; base64: string; mimeType: string }[] | 'sample') => {
    if (selected === 'sample') {
      setStep(2);
      processMenu('sample');
      return;
    }
    if (!selected || selected.length === 0) return;
    setStep(2);
    processMenu(selected);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const readers = selected.map((file) => {
      return new Promise<{ name: string; base64: string; mimeType: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            name: file.name,
            base64: event.target?.result as string,
            mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(readers);
    setStep(2);
    processMenu(results);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteInput.trim()) {
      setIsJoining(true);
      window.location.href = '/join/' + inviteInput.trim();
    }
  };

  const processMenu = async (filesOrSample: { name: string; base64: string; mimeType: string }[] | 'sample') => {
    setIsProcessing(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return 90;
        return p + Math.random() * 12;
      });
    }, 400);

    try {
      let data;
      if (filesOrSample === 'sample') {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        data = {
          success: true,
          data: {
            Monday: { Breakfast: ["Aloo Paratha", "Curd", "Tea", "Banana"], Lunch: ["Rajma", "Jeera Rice", "Roti", "Salad"], Snacks: ["Samosa", "Mint Chutney", "Tea"], Dinner: ["Paneer Butter Masala", "Dal Makhani", "Roti", "Gulab Jamun"] },
            Tuesday: { Breakfast: ["Poha", "Sev", "Jalebi", "Milk"], Lunch: ["Chole", "Bhature", "Rice", "Pickle"], Snacks: ["Veg Patties", "Coffee"], Dinner: ["Mix Veg", "Dal Tadka", "Roti", "Kheer"] },
            Wednesday: { Breakfast: ["Idli", "Medu Vada", "Sambar", "Chutney"], Lunch: ["Kadhi Pakora", "Khichdi", "Papad"], Snacks: ["Bread Pakora", "Tea"], Dinner: ["Egg Curry / Shahi Paneer", "Dal", "Roti"] },
            Thursday: { Breakfast: ["Upma", "Chutney", "Tea"], Lunch: ["Dal Makhani", "Jeera Rice", "Roti", "Raita"], Snacks: ["Maggi", "Coffee"], Dinner: ["Aloo Gobi Matar", "Yellow Dal", "Roti"] },
            Friday: { Breakfast: ["Masala Dosa", "Sambar", "Chutney"], Lunch: ["Soyabean Curry", "Rice", "Roti"], Snacks: ["Pasta", "Tea"], Dinner: ["Butter Chicken / Kadhai Paneer", "Naan", "Sweets"] },
            Saturday: { Breakfast: ["Puri Bhaji", "Halwa", "Tea"], Lunch: ["Moong Dal Khichdi", "Aloo Chokha", "Papad"], Snacks: ["Bhel Puri", "Tea"], Dinner: ["Malai Kofta", "Dal Fry", "Roti"] },
            Sunday: { Breakfast: ["Bread Omelette / Sandwich", "Juice"], Lunch: ["Hyderabadi Veg Biryani", "Raita"], Snacks: ["French Fries", "Cold Drink"], Dinner: ["Dal Baati Churma", "Kheer"] },
          },
          timings: {
            Breakfast: '8:00 - 10:00',
            Lunch: '12:30 - 2:30',
            Snacks: '4:30 - 5:30',
            Dinner: '7:30 - 9:30',
          },
        };
      } else {
        const res = await fetch('/api/extract-mess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: filesOrSample }),
        });
        data = await res.json();
      }

      clearInterval(interval);
      setProgress(100);

      setTimeout(() => {
        if (data.success && data.data) {
          setExtractedData(data.data);
          if (data.timings) {
            setExtractedTimings(data.timings);
          }
          setStep(3);
        } else {
          showToast('Extraction Failed', data.error || 'Could not parse the mess menu document.', 'error');
          setStep(1);
        }
        setIsProcessing(false);
      }, 400);
    } catch (error) {
      console.error(error);
      clearInterval(interval);
      showToast('Upload Error', 'Failed to connect to menu extraction service.', 'error');
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
      timings: extractedTimings,
    };

    try {
      await setDoc(doc(db, 'messes', newId), messDoc);
      setMessId(newId);
      updateMessMenu(messDoc);
      setStep(4);
      showToast('Mess Menu Published', 'Your weekly menu has been saved and synced.', 'success');
    } catch (e) {
      console.error('Failed to publish', e);
      // Fallback local save
      updateMessMenu(messDoc);
      setMessId(newId);
      setStep(4);
    }
  };

  const [copying, setCopying] = useState(false);
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/join/${messId}`;
    const res = await shareLink({
      title: 'Hostel Mess Menu',
      text: '🍛 Check out our weekly hostel mess menu & live meal timings on Intersemester:',
      url,
      dialogTitle: 'Share Mess Menu via',
    });
    if (res === 'copied') {
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  return (
    <div className="flex flex-col w-full pt-4 pb-12 sm:px-0 min-h-[calc(100vh-80px)] text-left">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col flex-1 w-full pt-2 sm:pt-6 pb-16"
          >
            <div className="mb-12 relative">
              {onCancel && (
                <button onClick={onCancel} className="absolute top-0 right-0 p-2 text-[#6B6B6B] hover:text-[#111111] dark:hover:text-[#FFFFFF]">
                  <X className="w-6 h-6" />
                </button>
              )}
              <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
                Hostel,<br />
                Mess,<br />
                Weekly,<br />
                Menu
              </h2>
              <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4 max-w-[280px]">
                Upload the weekly menu once. We'll organise meals, timings and days automatically.
              </p>

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => setShowJoinInput(true)}
                  className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
                >
                  Join Mess
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center justify-center h-10 px-4 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-semibold transition-colors gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Magic Import
                </button>
              </div>
            </div>

            {/* JOIN EXISTING */}
            {showJoinInput && (
              <div className="mb-12 border border-[#E5E5E5] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] p-5 flex flex-col md:flex-row md:items-center justify-between group rounded-none gap-4">
                <div className="flex flex-col">
                  <p className="text-[14px] text-[#111111] dark:text-[#FFFFFF] font-medium leading-relaxed">
                    Have an invite code?
                  </p>
                  <p className="text-[10px] font-bold tracking-[1px] uppercase text-[#6F6F6F] mt-1">
                    ENTER MESS ID BELOW
                  </p>
                </div>
                
                <div className="flex items-center flex-1 md:max-w-xs relative w-full">
                  <input 
                    type="text" 
                    placeholder="e.g. 1a2b3c4d"
                    className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2.5 text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        window.location.href = '/join/' + e.currentTarget.value;
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col justify-center flex-1 min-h-[500px] max-w-sm mx-auto w-full"
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
            className="flex flex-col h-full py-4 max-h-[80vh]"
          >
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-6 text-center">
              {isEditing ? 'EDIT YOUR MENU' : 'YOUR MENU IS READY'}
            </p>

            <div className="flex-1 overflow-y-auto mb-8 pr-2 flex flex-col gap-6">
              {/* Meal Timings Card */}
              <div className="bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] p-6">
                <div className="flex items-center justify-between mb-4 border-b border-[#D8D8D8] dark:border-[#333333] pb-2">
                  <h3 className="text-[14px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF]">
                    MEAL TIMINGS
                  </h3>
                  <span className="text-[11px] text-[#6F6F6F]">
                    Used for live notifications & meal tracker
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((meal) => (
                    <div key={meal} className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                        {meal}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={extractedTimings[meal] || ''}
                          onChange={(e) =>
                            setExtractedTimings({
                              ...extractedTimings,
                              [meal]: e.target.value,
                            })
                          }
                          placeholder="e.g. 8:00 - 10:00"
                          className="bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2 text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF]"
                        />
                      ) : (
                        <p className="text-[14px] font-mono font-medium text-[#111111] dark:text-[#FFFFFF]">
                          {extractedTimings[meal] || '8:00 - 10:00'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const dayData = extractedData[day] || {};
                // If not editing, maybe only show Monday to save space, but let's just show all to be thorough
                if (!isEditing && day !== 'Monday') return null;

                return (
                  <div key={day} className="bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] p-6">
                    <h3 className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-6 border-b border-[#D8D8D8] dark:border-[#333333] pb-2">
                      {day.toUpperCase()} {(!isEditing && day === 'Monday') && <span className="text-[11px] text-[#6F6F6F] ml-2 font-normal lowercase">(preview)</span>}
                    </h3>
                    
                    {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
                      const items = dayData[meal] || [];
                      if (!isEditing && items.length === 0) return null;
                      
                      return (
                        <div key={meal} className="mb-6 last:mb-0">
                          <h4 className="text-[12px] font-bold tracking-[1px] uppercase text-[#6F6F6F] mb-2">
                            {meal}
                          </h4>
                          {isEditing ? (
                            <input
                              type="text"
                              value={Array.isArray(items) ? items.join(', ') : items}
                              onChange={(e) => {
                                const newItems = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                setExtractedData({
                                  ...extractedData,
                                  [day]: {
                                    ...dayData,
                                    [meal]: newItems
                                  }
                                });
                              }}
                              placeholder="e.g. Aloo Paratha, Curd"
                              className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2.5 text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                            />
                          ) : (
                            <p className="text-[15px] text-[#111111] dark:text-[#FFFFFF] leading-relaxed">
                              {Array.isArray(items) ? items.join(' · ') : items}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {isEditing ? (
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="w-full h-12 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[14px] font-medium"
                >
                  Done Editing
                </button>
              ) : (
                <>
                  <Button onClick={handlePublish} className="w-full flex justify-center items-center gap-2 h-12 text-[14px]">
                    Looks good <ArrowRight className="w-4 h-4" />
                  </Button>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full h-12 border border-[#D8D8D8] dark:border-[#333333] text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
                  >
                    Edit menu
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center flex-1 min-h-[500px] text-center"
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
    
      
      <Modal isOpen={showJoinInput} onClose={() => setShowJoinInput(false)} title="Join Mess Menu">
        <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
          <p className="text-[13px] text-[#6B6B6B]">
            Enter a mess invite code or paste an invite link to view the shared menu.
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="e.g., ext_..."
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              className="w-full px-4 py-2 border border-[#E5E5E5] dark:border-[#333333] bg-transparent text-[13px] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isJoining}
            className="h-10 px-4 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-semibold flex items-center justify-center disabled:opacity-50"
          >
            {isJoining ? 'Joining...' : 'Join'}
          </button>
        </form>
      </Modal>
<MessImportModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
        onFileSelect={handleModalFileSelect} 
      />
    </div>
  );
};
