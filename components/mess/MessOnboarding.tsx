'use client';

import { AiScanning } from '@/components/ai/AiScan';
import { Illustration } from '@/components/ui/Illustration';
import { shareLink, PLAY_STORE_URL } from '@/lib/shareUtils';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, X, ArrowRight, CheckCircle2, Image as ImageIcon, Check } from '@/components/ui/icons';
import { useApp } from '@/context/AppContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MessImportModal } from './MessImportModal';
import { AiUploadError, prepareAiUpload, readAiResponse } from '@/lib/fileCompressor';
import { getAuthHeaders } from '@/lib/authHeaders';

export const MessOnboarding: React.FC<{ onCancel?: () => void; initialAction?: 'join' | 'import' | null }> = ({ onCancel, initialAction }) => {
  const { setActiveView, updateMessMenu, showToast, user } = useApp();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [showJoinInput, setShowJoinInput] = useState(initialAction === "join");
  const [inviteInput, setInviteInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showImportModal, setShowImportModal] = useState(initialAction === "import");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanImages, setScanImages] = useState<{ name: string; base64: string; mimeType: string }[]>([]);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extractedTimings, setExtractedTimings] = useState<Record<string, string>>({
    Breakfast: '8:00 - 10:00',
    Lunch: '12:30 - 2:30',
    Snacks: '4:30 - 5:30',
    Dinner: '7:30 - 9:30',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [messId, setMessId] = useState<string>('');

  const executeJoinMess = async (rawInput: string) => {
    let code = rawInput.trim();
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
        setShowJoinInput(false);
        setInviteInput('');
        showToast('Joined Mess', 'Mess menu successfully loaded into your app!', 'success');
        onCancel?.();
        setActiveView('mess');
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

  const handleModalFileSelect = async (selected: { name: string; base64: string; mimeType: string }[]) => {
    if (!selected || selected.length === 0) return;
    setStep(2);
    processMenu(selected);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    try {
      const results = await prepareAiUpload(selected, { maxDim: 1800 });
      setStep(2);
      processMenu(results);
    } catch (err) {
      showToast("Can't send these files", err instanceof AiUploadError ? err.message : 'Failed to process files. Please try again.', 'error');
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteInput.trim()) {
      executeJoinMess(inviteInput);
    }
  };

  const processMenu = async (files: { name: string; base64: string; mimeType: string }[]) => {
    setScanImages(files);
    setIsProcessing(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return 90;
        return p + Math.random() * 12;
      });
    }, 400);

    try {
      const res = await fetch('/api/extract-mess', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          images: files,
          userId: user?.id || (user as any)?.uid || null,
        }),
      });
      const data = await readAiResponse(res);

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
      // Firestore rules only let the publisher update this shared menu later
      ...(user?.id ? { creatorId: user.id } : {}),
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
    const code = messId;
    const shareText = `🍛 *Join our Hostel Mess Menu on Intersemester!*

🔑 *Mess Code:* ${code}

🍽️ Live Meal Countdowns, Daily Dishes & Serving Hours

📲 *Download App on Play Store:*
${PLAY_STORE_URL}

👉 Open Intersemester App → Go to Mess tab → Enter Code: *${code}*`;

    const res = await shareLink({
      title: 'Hostel Mess Menu',
      text: shareText,
      dialogTitle: 'Share Mess Code via',
    });
    if (res === 'copied') {
      setCopying(true);
      showToast('Copied', `Mess code copied: ${code}`, 'success');
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
                <button onClick={onCancel} className="absolute top-0 right-0 p-2 text-[#6B6B6B] hover:text-fg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              )}
              <Illustration name="mess" className="h-[150px] w-auto mb-f5" />
              <h2 className="page-title">
                Hostel,<br />
                Mess,<br />
                Weekly,<br />
                Menu
              </h2>
              <p className="text-[14px] font-normal text-muted leading-[20px] mt-4 max-w-[280px]">
                Upload the weekly menu once. We'll organise meals, timings and days automatically.
              </p>

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => setShowJoinInput(true)}
                  className="btn btn-secondary"
                >
                  Join Mess
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="btn btn-primary"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" /> Magic Import
                </button>
              </div>
            </div>

            {/* JOIN EXISTING */}
            {showJoinInput && (
              <div className="mb-12 rounded-none border border-line bg-surface-2 p-5 flex flex-col md:flex-row md:items-center justify-between group gap-4 shadow-sm">
                <div className="flex flex-col">
                  <p className="text-[14px] text-fg font-medium leading-relaxed">
                    Have an invite code?
                  </p>
                  <p className="text-[12px] font-bold text-muted mt-1">
                    Enter mess id below
                  </p>
                </div>
                
                <div className="flex items-center flex-1 md:max-w-xs relative w-full">
                  <input 
                    type="text" 
                    placeholder="e.g. 1a2b3c4d"
                    className="w-full bg-surface border border-line rounded-none px-3.5 py-2.5 text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors shadow-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        executeJoinMess(e.currentTarget.value);
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
            <AiScanning kind="mess" images={scanImages} />
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
            <p className="text-[12px] font-bold text-muted mb-6 text-center">
              {isEditing ? 'EDIT YOUR MENU' : 'YOUR MENU IS READY'}
            </p>

            <div className="flex-1 overflow-y-auto mb-8 pr-2 flex flex-col gap-6">
              {/* Meal Timings Card */}
              <div className="bg-surface border border-line rounded-none p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-line pb-3">
                  <h3 className="text-[13px] font-bold text-fg">
                    Meal timings
                  </h3>
                  <span className="text-[11px] text-muted">
                    Used for live notifications & meal tracker
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((meal) => (
                    <div key={meal} className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
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
                          className="bg-surface-2 border border-line rounded-none px-3.5 py-2 text-[13px] text-fg focus:outline-none focus:border-line-strong"
                        />
                      ) : (
                        <p className="text-[14px] font-mono font-medium text-fg">
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
                  <div key={day} className="bg-surface border border-line rounded-none p-6 shadow-sm">
                    <h3 className="text-[15px] font-bold text-fg mb-6 border-b border-line pb-3">
                      {day.toUpperCase()} {(!isEditing && day === 'Monday') && <span className="text-[11px] text-muted ml-2 font-normal lowercase">(preview)</span>}
                    </h3>
                    
                    {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
                      const items = dayData[meal] || [];
                      if (!isEditing && items.length === 0) return null;
                      
                      return (
                        <div key={meal} className="mb-6 last:mb-0">
                          <h4 className="text-[11px] font-bold tracking-[1px] uppercase text-muted mb-2">
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
                              className="w-full bg-surface-2 border border-line rounded-none px-3.5 py-2.5 text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                            />
                          ) : (
                            <p className="text-[14px] text-fg leading-relaxed">
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
                  className="w-full h-11 rounded-none bg-ink text-on-ink text-[14px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                >
                  Done Editing
                </button>
              ) : (
                <>
                  <Button onClick={handlePublish} className="w-full flex justify-center items-center gap-2 h-12 text-[14px] rounded-none shadow-sm">
                    Looks good <ArrowRight className="w-4 h-4" />
                  </Button>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full h-11 rounded-none border border-line text-[14px] font-semibold text-fg bg-white dark:bg-white/[0.06] hover:bg-black/5 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
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
            <Illustration name="trophy" className="h-[150px] w-auto mb-f5" />
            <p className="text-[12px] font-bold text-muted mb-6">
              YOUR MESS IS READY 🎉
            </p>
            <h2 className="text-[32px] font-semibold leading-[1.1] text-fg mb-4">
              Share this link with your hostel mates.
            </h2>
            <p className="text-muted text-[14px] mb-8">
              Anyone with this link can join.
            </p>

            <div className="flex items-center justify-between w-full p-4 rounded-none border border-line bg-surface-2 mb-6 shadow-sm">
              <span className="text-[15px] font-mono font-medium text-fg truncate mr-4">
                intersemester.app/join/{messId}
              </span>
            </div>

            <div className="flex flex-col w-full gap-3">
              <Button onClick={handleCopyLink} className="w-full h-12 text-[14px] rounded-none flex items-center justify-center gap-2 shadow-sm">
                {copying ? <><Check className="w-4 h-4" /> Copied</> : 'Copy invite link'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  if (onCancel) onCancel();
                  setActiveView('mess');
                }}
                className="btn btn-secondary w-full"
              >
                Go to my mess menu <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    
      
      <Modal isOpen={showJoinInput} onClose={() => setShowJoinInput(false)} title="Join Mess Menu">
        <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
          <p className="text-[13px] text-muted">
            Enter a mess invite code or paste an invite link to view the shared menu.
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="e.g., ext_..."
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-none border border-line bg-surface text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors shadow-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isJoining}
            className="btn btn-primary"
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
