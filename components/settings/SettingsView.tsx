'use client';

import { shareLink } from '@/lib/shareUtils';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useApp } from '@/context/AppContext';
import { Programme, Branch } from '@/lib/types';
import { storage } from '@/lib/storage';
import { INDIAN_COLLEGES, STANDARD_PROGRAMMES, STANDARD_BRANCHES } from '@/lib/colleges';
import { scheduleTestNotification } from '@/lib/localNotifications';
import { getCanonicalBatchKey } from '@/lib/timetableUtils';
import {
  User,
  GraduationCap,
  Bell,

  Upload,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Building2,
  Mail,
  Hash,
  AlertTriangle,
  X,
  FileText,
  Shield,
  MessageSquare,
  Info,
  ChevronRight,
  Share2,
  Crown,
  Users,
  Sun,
  Moon,
  Check,
  CalendarDays,
  MoreHorizontal, Download,
  Cloud,
  LogIn,
  LogOut, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { isUserSuperAdmin } from '@/lib/adminAuth';
import { BatchMembersModal } from '@/components/batch/BatchMembersModal';

export const SettingsView: React.FC = () => {
  const { user, isClerkLoaded } = useApp();
  const isLoaded = isClerkLoaded;
  const isSignedIn = !!user;
  const {
    profile,
    isBatchCR,
    updateProfile,
    settings,
    updateSettings,
    showToast,
    setShowOnboarding,
    triggerSimulatedAlert,
    resetAllData,
    currentBatchData,
    searchBatchTimetable,
    joinBatchTimetable,
    shareTimetableWithBatch,
    disconnectBatchTimetable,
  } = useApp();

  const [name, setName] = useState(profile.name);
  const [college, setCollege] = useState(profile.college);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [suggestedColleges, setSuggestedColleges] = useState<string[]>([]);
  const [isLoadingColleges, setIsLoadingColleges] = useState(false);
  const [showProgrammeDropdown, setShowProgrammeDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [rollNumber, setRollNumber] = useState(profile.rollNumber);
  const [email, setEmail] = useState(profile.email);
  const [programme, setProgramme] = useState<string>(
    profile.programme === 'CMIT' ? 'Mtech- CMIT' : (profile.programme || '')
  );
  const [branch, setBranch] = useState<string>(profile.branch || '');
  const [year, setYear] = useState(profile.year);
  const [semester, setSemester] = useState(profile.semester);
  const [section, setSection] = useState<string>(profile.section || 'A');
  const [pendingBatchKey, setPendingBatchKey] = useState<string | null>(null);
  const [matchedBatchData, setMatchedBatchData] = useState<any>(null);

  // Debounced SheerID organization search lookup
  useEffect(() => {
    if (college.trim().length < 3) {
      setSuggestedColleges([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoadingColleges(true);
      try {
        const response = await fetch(
          `https://orgsearch.sheerid.net/rest/organization/search?country=IN&type=UNIVERSITY&name=${encodeURIComponent(college)}`
        );
        if (response.ok) {
          const data = await response.json();
          const names = data.map((item: any) => item.name);
          setSuggestedColleges(names);
        }
      } catch (err) {
        console.error('Failed to fetch colleges from SheerID:', err);
      } finally {
        setIsLoadingColleges(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [college]);

  // High-friction Reset Modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [showBatchMembersModal, setShowBatchMembersModal] = useState(false);
  const [showBatchSettingsModal, setShowBatchSettingsModal] = useState(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Hold-to-Reset timer logic
  useEffect(() => {
    if (isHolding) {
      holdIntervalRef.current = setInterval(() => {
        setHoldProgress((prev) => {
          if (prev >= 100) {
            clearInterval(holdIntervalRef.current!);
            executeReset();
            return 100;
          }
          return prev + 1.25;
        });
      }, 25);
    } else {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
      }
      setHoldProgress(0);
    }
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [isHolding]);

  const executeReset = async () => {
    await resetAllData();
    setShowResetModal(false);
    showToast('Reset Complete', 'All application data has been wiped to defaults', 'success');
  };

  const [isEditingAcademic, setIsEditingAcademic] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState(profile.avatarUrl || profile.id || 'default');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [activeSetting, setActiveSetting] = useState<'classReminder' | 'eveningCheck' | 'hwWarning' | null>(null);
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [classReminderMinutes, setClassReminderMinutes] = useState(settings.classReminderMinutes);
  const [eveningTime, setEveningTime] = useState(settings.eveningCarryReminderTime);
  const [hwDays, setHwDays] = useState(settings.homeworkWarningDays);

  const handleAvatarSelect = (seed: string) => {
    setAvatarSeed(seed);
    setShowAvatarModal(false);
    updateProfile({
      ...profile,
      avatarUrl: seed,
    });
    showToast('Avatar Updated', 'Your profile picture has been changed.', 'success');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCollege = college.trim();
    const cleanProg = programme.trim();
    const cleanBranch = branch.trim();
    const cleanSem = Number(semester);
    const cleanSec = section.trim() || 'A';

    const hasAcademicChanges = 
      cleanCollege !== profile.college ||
      cleanProg !== profile.programme ||
      cleanBranch !== profile.branch ||
      cleanSem !== profile.semester ||
      cleanSec !== (profile.section || 'A');

    const savedFields = {
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      email: email.trim(),
      year: Number(year),
      section: cleanSec,
    };

    if (hasAcademicChanges) {
      const newKey = getCanonicalBatchKey(cleanCollege, cleanProg, cleanBranch, cleanSem, cleanSec);
      if (newKey !== profile.batchKey) {
        setIsLoadingColleges(true);
        const matched = await searchBatchTimetable(cleanCollege, cleanProg, cleanBranch, cleanSem, cleanSec);
        setIsLoadingColleges(false);
        
        if (matched) {
          setMatchedBatchData(matched);
          setPendingBatchKey(newKey);
          return; // Pause profile saving and show modal choice
        }
      }
    }

    // Normal profile save
    updateProfile({
      ...savedFields,
      college: cleanCollege,
      programme: cleanProg,
      branch: cleanBranch,
      semester: cleanSem,
      section: cleanSec,
      batchKey: profile.batchKey,
      isBatchSynced: profile.isBatchSynced,
    });
    showToast('Profile Saved', 'Academic records updated successfully', 'success');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      classReminderMinutes: Number(classReminderMinutes),
      eveningCarryReminderTime: eveningTime,
      homeworkWarningDays: Number(hwDays),
    });
    showToast('Preferences Saved', 'Notification schedules updated', 'success');
  };



  const handleExportBackup = () => {
    const json = storage.exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intersemester_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Backup Exported', 'All timetable and task data saved', 'success');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = storage.importBackup(content);
      if (success) {
        window.location.reload();
      } else {
        showToast('Import Error', 'Invalid backup file format', 'warning');
      }
    };
    reader.readAsText(file);
  };

  const initials = (name || 'Student')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Shared input class for the brutalist theme
  const inputClass =
    'w-full px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-black dark:border-white text-sm font-medium text-black dark:text-white focus:outline-none placeholder:text-black/30 dark:placeholder:text-white/30';

  const labelClass = 'text-[11px] font-bold tracking-widest uppercase text-black/60 dark:text-white/60';

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl mx-auto w-full pb-12">
      {/* Editorial Stacked Header */}
      <div className="flex flex-col gap-4 pt-2 sm:pt-6">
        <div>
          <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
            Settings,<br />Profile
          </h2>
          <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4 max-w-md">
            Manage your student identity, reminders, and data preferences.
          </p>
        </div>

      </div>

      {/* Student Identity Card */}
      <div className="border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] p-[20px] rounded-none">
        <div className="flex items-start gap-5">
          {/* Avatar & Change Photo Column */}
          <div className="flex flex-col gap-3 items-center shrink-0">
            <div className="w-[64px] h-[64px] border border-[#D8D8D8] dark:border-[#333333] flex items-center justify-center overflow-hidden bg-[#F7F7F5] dark:bg-[#1A1A1A]">
              <img
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}&backgroundColor=transparent`}
                alt="avatar"
                className="w-full h-full object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAvatarModal(true)}
              className="text-[11px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors underline underline-offset-2 cursor-pointer"
            >
              Change photo
            </button>
          </div>

          <div className="flex flex-col mt-0.5 min-w-0">
            <div className="flex items-center gap-[12px] flex-wrap w-full">
              <h2 className="text-[24px] font-medium text-[#111111] dark:text-[#FFFFFF] leading-none break-words">
                {name || 'Student Name'}
              </h2>
              <span 
                className="flex items-center gap-[5px] bg-[#F3F2EF] dark:bg-[#F3F2EF] text-[#111111] rounded-[16px] shrink-0 h-[30px]"
                style={{ padding: '0px 10px 0px 5px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <circle cx="12" cy="12" r="12" fill="#111111" />
                  <path d="M7.5 12L10.5 15L17 8" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[10px] font-[600] mt-[1px]" style={{ letterSpacing: '1.6px' }}>
                  VERIFIED
                </span>
              </span>
            </div>
            
            <p className="text-[13px] text-[#6F6F6F] mt-2.5 leading-snug max-w-md truncate">
              {programme} · {branch}
            </p>
            
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[1px] text-[#A0A0A0] mt-3 flex-wrap">
              <span>Sem {semester}</span>
              <span>·</span>
              <span>Year {year}</span>
              {rollNumber && (
                <>
                  <span>·</span>
                  <span>Roll #{rollNumber}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Academic Profile & Batch Content */}
        <div className="lg:col-span-7 flex flex-col gap-6">
        
          <div className="border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] p-0 flex flex-col rounded-none">
            <div className="flex items-center justify-between p-5 pb-4 border-b border-[#D8D8D8] dark:border-[#333333]">
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.5px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                <GraduationCap className="w-[18px] h-[18px] stroke-[1.5]" />
                <span>Academic Information</span>
              </div>
              {!isEditingAcademic && (
                <button
                  onClick={() => setIsEditingAcademic(true)}
                  className="text-[11px] font-bold tracking-widest uppercase text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors cursor-pointer"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="p-5 sm:p-6">
              {!isEditingAcademic ? (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">College / University</span>
                    <span className="text-[15px] font-[600] text-[#111111] dark:text-[#FFFFFF] leading-snug">{college || 'Not specified'}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">Programme</span>
                    <span className="text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF]">{programme} {branch ? `· ${branch}` : ''}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">Roll Number</span>
                    <span className="text-[14px] font-mono font-medium text-[#111111] dark:text-[#FFFFFF]">{rollNumber || 'Not specified'}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">Institute Email</span>
                    <a href={`mailto:${email}`} className="text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:underline underline-offset-2 w-fit">{email || 'Not specified'}</a>
                  </div>
                </div>
              ) : (
                <form onSubmit={async (e) => { 
                  await handleSaveProfile(e); 
                  setIsEditingAcademic(false); 
                }} className="flex flex-col gap-5">
                  {/* College Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">College / University</label>
                    <div className="relative w-full">
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333]">
                        <Building2 className="w-4 h-4 text-[#A0A0A0] shrink-0" />
                        <input
                          type="text"
                          value={college}
                          onChange={(e) => {
                            setCollege(e.target.value);
                            setShowCollegeDropdown(true);
                          }}
                          onFocus={() => setShowCollegeDropdown(true)}
                          onBlur={() => setTimeout(() => setShowCollegeDropdown(false), 200)}
                          placeholder="e.g. NIT Trichy, IIT Bombay..."
                          required
                          className="w-full bg-transparent text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none placeholder:text-[#A0A0A0]"
                        />
                      </div>
                      {showCollegeDropdown && college.length >= 2 && (
                        <div className="absolute top-full left-0 w-full mt-1 max-h-56 overflow-y-auto bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] shadow-lg z-50">
                          {isLoadingColleges && (
                            <div className="px-4 py-2.5 text-xs font-mono font-medium text-[#6F6F6F] border-b border-[#D8D8D8] dark:border-[#333333]">
                              Searching...
                            </div>
                          )}
                          {suggestedColleges.length > 0 ? (
                            suggestedColleges.map((c) => (
                              <div
                                key={c}
                                onMouseDown={() => { setCollege(c); setShowCollegeDropdown(false); }}
                                className="px-4 py-2.5 hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] cursor-pointer text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF] border-b border-[#D8D8D8] dark:border-[#333333] last:border-0"
                              >
                                {c}
                              </div>
                            ))
                          ) : (
                            !isLoadingColleges && INDIAN_COLLEGES.filter(c => c.toLowerCase().includes(college.toLowerCase())).slice(0, 15).map(c => (
                              <div
                                key={c}
                                onMouseDown={() => { setCollege(c); setShowCollegeDropdown(false); }}
                                className="px-4 py-2.5 hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] cursor-pointer text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF] border-b border-[#D8D8D8] dark:border-[#333333] last:border-0"
                              >
                                {c}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-[#A0A0A0] font-medium mt-0.5">
                      Type 3 letters to search verified universities, or type manually if not found.
                    </p>
                  </div>

                  {/* Roll Number & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">Roll Number</label>
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333]">
                        <Hash className="w-4 h-4 text-[#A0A0A0] shrink-0" />
                        <input
                          type="text"
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value)}
                          required
                          className="w-full bg-transparent text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">Institute Email</label>
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333]">
                        <Mail className="w-4 h-4 text-[#A0A0A0] shrink-0" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full bg-transparent text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Programme & Branch */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">Degree / Programme</label>
                      <div className="relative w-full">
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333]">
                          <GraduationCap className="w-4 h-4 text-[#A0A0A0] shrink-0" />
                          <input
                            type="text"
                            value={programme}
                            onChange={(e) => {
                              setProgramme(e.target.value);
                              setShowProgrammeDropdown(true);
                            }}
                            onFocus={() => setShowProgrammeDropdown(true)}
                            onBlur={() => setTimeout(() => setShowProgrammeDropdown(false), 200)}
                            placeholder="e.g. B.Tech, B.Sc"
                            required
                            className="w-full bg-transparent text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none placeholder:text-[#A0A0A0]"
                          />
                        </div>
                        {showProgrammeDropdown && (
                          <div className="absolute top-full left-0 w-full mt-1 max-h-48 overflow-y-auto bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] shadow-lg z-50">
                            {STANDARD_PROGRAMMES.filter(p => p.toLowerCase().includes(programme.toLowerCase())).length > 0 ? (
                              STANDARD_PROGRAMMES.filter(p => p.toLowerCase().includes(programme.toLowerCase())).map(p => (
                                <div
                                  key={p}
                                  onMouseDown={() => { setProgramme(p); setShowProgrammeDropdown(false); }}
                                  className="px-4 py-2 hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] cursor-pointer text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF] border-b border-[#D8D8D8] dark:border-[#333333] last:border-0"
                                >
                                  {p}
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-xs text-[#6F6F6F] font-mono">
                                Press Enter to use custom degree
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">Major / Branch</label>
                      <div className="relative w-full">
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333]">
                          <Building2 className="w-4 h-4 text-[#A0A0A0] shrink-0" />
                          <input
                            type="text"
                            value={branch}
                            onChange={(e) => {
                              setBranch(e.target.value);
                              setShowBranchDropdown(true);
                            }}
                            onFocus={() => setShowBranchDropdown(true)}
                            onBlur={() => setTimeout(() => setShowBranchDropdown(false), 200)}
                            placeholder="e.g. Computer Science"
                            required
                            className="w-full bg-transparent text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none placeholder:text-[#A0A0A0]"
                          />
                        </div>
                        {showBranchDropdown && (
                          <div className="absolute top-full left-0 w-full mt-1 max-h-48 overflow-y-auto bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] shadow-lg z-50">
                            {STANDARD_BRANCHES.filter(b => b.toLowerCase().includes(branch.toLowerCase())).length > 0 ? (
                              STANDARD_BRANCHES.filter(b => b.toLowerCase().includes(branch.toLowerCase())).map(b => (
                                <div
                                  key={b}
                                  onMouseDown={() => { setBranch(b); setShowBranchDropdown(false); }}
                                  className="px-4 py-2 hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] cursor-pointer text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF] border-b border-[#D8D8D8] dark:border-[#333333] last:border-0"
                                >
                                  {b}
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-xs text-[#6F6F6F] font-mono">
                                Press Enter to use custom branch
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Year, Semester & Section */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">Year</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333]">
                        <CalendarDays className="w-4 h-4 text-[#A0A0A0] shrink-0" />
                        <input
                          type="number"
                          min="1"
                          max="7"
                          value={year}
                          onChange={(e) => setYear(Number(e.target.value))}
                          required
                          className="w-full bg-transparent text-[13.5px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">Semester (1-14)</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333]">
                        <input
                          type="number"
                          min="1"
                          max="14"
                          value={semester}
                          onChange={(e) => setSemester(Number(e.target.value))}
                          required
                          className="w-full bg-transparent text-[13.5px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <button type="submit" className="bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] px-5 py-2.5 text-[13px] font-bold hover:opacity-90 transition-opacity cursor-pointer">
                      Save Changes
                    </button>
                    <button type="button" onClick={() => setIsEditingAcademic(false)} className="px-4 py-2.5 text-[13px] font-bold text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          
          {/* YOUR BATCH */}
          <div className="flex flex-col gap-0 mt-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8D8D8] dark:border-[#333333]">
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.5px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                <Users className="w-[18px] h-[18px] stroke-[1.5]" />
                <span>Your Batch</span>
              </div>
            </div>
            
            {profile.isBatchSynced ? (
              <div className="flex flex-col py-5 border-b border-[#D8D8D8] dark:border-[#333333]">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wide">
                      {profile.programme} {profile.branch ? `· ${profile.branch}` : ''}
                    </span>
                    <div className="flex items-center gap-2 text-[13px] text-[#6F6F6F]">
                      <span>Semester {profile.semester} · Year {Math.ceil((profile.semester || 1) / 2)}</span>
                    </div>
                  </div>
                  {isBatchCR && (
                    <span className="text-[10px] font-bold tracking-widest text-[#111111] dark:text-[#FFFFFF] border border-[#111111] dark:border-[#FFFFFF] px-1.5 py-0.5 uppercase">
                      CR
                    </span>
                  )}
                </div>

                {/* Class Join Passcode */}
                {currentBatchData?.inviteCode && (
                  <div className="mt-4 p-3 bg-[#FBFBFA] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#333333] flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#888888]">Class Batch Code</span>
                      <span className="text-[15px] font-mono font-bold tracking-[2px] text-[#111111] dark:text-[#FFFFFF]">
                        {currentBatchData.inviteCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentBatchData.inviteCode);
                        showToast('Code Copied', `Batch code ${currentBatchData.inviteCode} copied to clipboard.`, 'success');
                      }}
                      className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Copy Code
                    </button>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowBatchMembersModal(true)} 
                      className="px-4 py-2 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[11px] font-bold uppercase tracking-wider rounded-none hover:opacity-90 transition-opacity"
                    >
                      {isBatchCR ? 'Manage members' : 'View members'}
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const code = await shareTimetableWithBatch();
                          const link = `${window.location.origin}/?invite=${code}`;
                          const res = await shareLink({
      title: 'Join our Class Timetable',
      text: 'Hey! 👋 Join our class on Intersemester to get our synced timetable, next class alerts & shared updates:',
      url: link,
      dialogTitle: 'Invite Classmates via',
    });
                          if (res === 'copied') showToast('Invite Link Copied', 'Share this link with your classmates!', 'success');
                        } catch (err) {}
                      }} 
                      className="px-4 py-2 border border-[#D8D8D8] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] text-[#111111] dark:text-[#FFFFFF] text-[11px] font-bold uppercase tracking-wider rounded-none transition-colors"
                    >
                      Invite
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowBatchSettingsModal(true)} 
                    className="p-2 -mr-2 text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col py-5 border-b border-[#D8D8D8] dark:border-[#333333] gap-4">
                <span className="text-[13px] text-[#6F6F6F]">You are not connected to any batch.</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const code = await shareTimetableWithBatch();
                      const link = `${window.location.origin}/?invite=${code}`;
                      const res = await shareLink({
      title: 'Join our Class Timetable',
      text: 'Hey! 👋 Join our class on Intersemester to get our synced timetable, next class alerts & shared updates:',
      url: link,
      dialogTitle: 'Invite Classmates via',
    });
                      if (res === 'copied') showToast('Link Copied', 'Invite link copied to clipboard!', 'success');
                    } catch (err) {}
                  }}
                  className="self-start px-4 py-2 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[11px] font-bold uppercase tracking-wider rounded-none hover:opacity-90 transition-opacity"
                >
                  Create & Invite Classmates
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Account & Cloud Sync */}
          <div className="flex flex-col gap-0 mt-6 lg:mt-0">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.5px] font-bold text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D8D8D8] dark:border-[#333333]">
              <Cloud className="w-[18px] h-[18px] stroke-[1.5]" />
              <span>Account & Cloud Sync</span>
            </div>
            
            {user ? (
              <div 
                onClick={() => setShowCloudSyncModal(true)}
                className="flex items-center justify-between py-5 border-b border-[#D8D8D8] dark:border-[#333333] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors -mx-5 px-5 sm:mx-0 sm:px-0 sm:hover:bg-transparent group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-[#D8D8D8] dark:border-[#333333] flex items-center justify-center overflow-hidden bg-[#F4F4F4] dark:bg-[#1A1A1A]">
                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}&backgroundColor=transparent`} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-none group-hover:underline underline-offset-2">
                      {user.fullName || profile.name || 'Student'}
                    </span>
                    <span className="text-[12px] text-[#6F6F6F]">
                      {user.primaryEmailAddress?.emailAddress || profile.email || 'Connected'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#6F6F6F] hidden sm:inline-block">Cloud Active</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-5 border-b border-[#D8D8D8] dark:border-[#333333]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-[#D8D8D8] dark:border-[#333333] flex items-center justify-center overflow-hidden bg-[#F4F4F4] dark:bg-[#1A1A1A] font-bold text-[13px] text-[#888888]">
                      G
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-none">Guest User</span>
                      <span className="text-[12px] text-[#888888]">Local mode · Not connected</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#888888] hidden sm:inline-block">Local Only</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Link
                    href="/sign-in"
                    className="px-4 py-2 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[11px] font-bold uppercase tracking-wider rounded-none hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In / Sync
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowCloudSyncModal(true)}
                    className="px-3 py-2 border border-[#D8D8D8] dark:border-[#333333] text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Appearance & Alerts */}
          <div className="flex flex-col gap-0 mt-6">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.5px] font-bold text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D8D8D8] dark:border-[#333333]">
              <Sparkles className="w-[18px] h-[18px] stroke-[1.5]" />
              <span>Appearance & Alerts</span>
            </div>
            
            {/* Theme Toggle */}
            <div className="flex items-center justify-between py-5 border-b border-[#D8D8D8] dark:border-[#333333]">
              <div className="flex items-center gap-3">
                <Sun className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF] stroke-[1.5]" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-none">Theme Preference</span>
                  <span className="text-[12px] text-[#6F6F6F]">Switch between light and dark</span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-[#F4F4F4] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] p-1">
                <button
                  onClick={() => updateSettings({ theme: 'light' })}
                  className={`px-3 py-1 text-[11px] font-bold uppercase cursor-pointer transition-colors ${
                    settings.theme === 'light' ? 'bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111]' : 'text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF]'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className={`px-3 py-1 text-[11px] font-bold uppercase cursor-pointer transition-colors ${
                    settings.theme === 'dark' ? 'bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111]' : 'text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF]'
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>

            {/* Class Notification */}
            <div 
              onClick={() => { setActiveSetting('classReminder'); setShowSettingModal(true); }}
              className="flex items-center justify-between py-5 border-b border-[#D8D8D8] dark:border-[#333333] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors -mx-5 px-5 sm:mx-0 sm:px-0 sm:hover:bg-transparent group"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF] stroke-[1.5]" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-none group-hover:underline underline-offset-2">Class Reminder</span>
                  <span className="text-[12px] text-[#6F6F6F]">Alert before class starts</span>
                </div>
              </div>
              <span className="text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF]">{settings.classReminderMinutes} min</span>
            </div>

            {/* Carry Check */}
            <div 
              onClick={() => { setActiveSetting('eveningCheck'); setShowSettingModal(true); }}
              className="flex items-center justify-between py-5 border-b border-[#D8D8D8] dark:border-[#333333] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors -mx-5 px-5 sm:mx-0 sm:px-0 sm:hover:bg-transparent group"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF] stroke-[1.5]" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-none group-hover:underline underline-offset-2">Evening Carry Bag Check</span>
                  <span className="text-[12px] text-[#6F6F6F]">Daily reminder to pack bag</span>
                </div>
              </div>
              <span className="text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF]">{settings.eveningCarryReminderTime}</span>
            </div>
            
            <div 
              onClick={() => { setActiveSetting('hwWarning'); setShowSettingModal(true); }}
              className="flex items-center justify-between py-5 border-b border-[#D8D8D8] dark:border-[#333333] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors -mx-5 px-5 sm:mx-0 sm:px-0 sm:hover:bg-transparent group"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF] stroke-[1.5]" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-none group-hover:underline underline-offset-2">Task & Homework Warning</span>
                  <span className="text-[12px] text-[#6F6F6F]">Days before deadline to remind</span>
                </div>
              </div>
              <span className="text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF]">{settings.homeworkWarningDays} day{settings.homeworkWarningDays > 1 ? 's' : ''}</span>
            </div>
            
            <div 
              onClick={() => {
                showToast('Testing Native Alarm', 'Closing app for 5 seconds to test background notification...', 'info');
                setTimeout(() => {
                  scheduleTestNotification(5);
                  if (typeof (navigator as any).app !== 'undefined') {
                    (navigator as any).app.exitApp();
                  } else {
                    window.close();
                  }
                }, 1500);
              }}
              className="flex items-center justify-between py-5 border-b border-[#D8D8D8] dark:border-[#333333] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors -mx-5 px-5 sm:mx-0 sm:px-0 sm:hover:bg-transparent group"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF] stroke-[1.5]" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-none group-hover:underline underline-offset-2">Test Native Alarm</span>
                  <span className="text-[12px] text-[#6F6F6F]">Simulate an alert (closes app for 5s)</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#A0A0A0]" />
            </div>

          </div>

          <div className="flex flex-col gap-0 mt-6">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.5px] font-bold text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D8D8D8] dark:border-[#333333]">
              <ShieldCheck className="w-[18px] h-[18px] stroke-[1.5]" />
              <span>Data & Storage</span>
            </div>

            <button type="button" onClick={handleExportBackup} className="flex items-center justify-between py-4 border-b border-[#D8D8D8] dark:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer text-left">
              <span className="text-[17px] font-medium text-[#111111] dark:text-[#FFFFFF]">Export data</span>
              <ChevronRight className="w-[14px] h-[14px] text-[#A0A0A0]" />
            </button>

            <label className="flex items-center justify-between py-4 border-b border-[#D8D8D8] dark:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer text-left">
              <span className="text-[17px] font-medium text-[#111111] dark:text-[#FFFFFF]">Import data</span>
              <ChevronRight className="w-[14px] h-[14px] text-[#A0A0A0]" />
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>

            <button type="button" onClick={() => setShowResetModal(true)} className="flex items-center justify-between py-4 border-b border-[#D8D8D8] dark:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer text-left">
              <span className="text-[17px] font-medium text-rose-500">Clear workspace data</span>
              <ChevronRight className="w-[14px] h-[14px] text-rose-500/50" />
            </button>
          </div>

          {/* Super Admin */}
          {isUserSuperAdmin(profile, user?.primaryEmailAddress?.emailAddress) && (
            <div className="flex flex-col gap-0 mt-6">
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.5px] font-bold text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D8D8D8] dark:border-[#333333]">
                <ShieldCheck className="w-[18px] h-[18px] stroke-[1.5]" />
                <span>Super Admin</span>
              </div>
              
              <Link
                href="/admin"
                className="flex items-center justify-between py-4 border-b border-[#D8D8D8] dark:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer text-left"
              >
                <span className="text-[17px] font-medium text-[#111111] dark:text-[#FFFFFF]">Control Center</span>
                <ChevronRight className="w-[14px] h-[14px] text-[#A0A0A0]" />
              </Link>
            </div>
          )}

          {/* Legal, Privacy & Support */}
          <div className="flex flex-col gap-0 mt-6">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.5px] font-bold text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D8D8D8] dark:border-[#333333]">
              <Shield className="w-[18px] h-[18px] stroke-[1.5]" />
              <span>Legal & Support</span>
            </div>
            
            {[
              { href: '/privacy', icon: Shield, label: 'Privacy Policy' },
              { href: '/terms', icon: FileText, label: 'Terms & Conditions' },
              { href: '/contact', icon: MessageSquare, label: 'Contact Support' },
              { href: '/delete-data', icon: AlertTriangle, label: 'Data Deletion Request' },
              { href: '/about', icon: Info, label: 'About Intersemester (v1.2.0)' },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between py-4 border-b border-[#D8D8D8] dark:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 text-[#111111] dark:text-[#FFFFFF]">
                  <span className="text-[17px] font-medium">{label}</span>
                </div>
                <ChevronRight className="w-[14px] h-[14px] text-[#A0A0A0]" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Hold-to-Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsHolding(false);
                setShowResetModal(false);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] shadow-2xl p-6 sm:p-7 overflow-hidden z-10 text-left flex flex-col gap-5 font-sans"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsHolding(false);
                  setShowResetModal(false);
                }}
                className="absolute top-5 right-5 p-1 text-[#A0A0A0] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Warning Icon Header */}
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-[20px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-snug">
                  Erase all workspace data?
                </h3>
                
                <div className="text-[13px] text-[#6F6F6F] leading-relaxed flex flex-col gap-2 mt-1">
                  <p className="font-medium">This will permanently delete:</p>
                  <ul className="flex flex-col gap-1 pl-1 text-[#6F6F6F] font-medium">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Classes & timetable</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Tasks & assignments</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Custom bag items</span>
                    </li>
                  </ul>
                  <p className="font-medium mt-1">This cannot be undone.</p>
                </div>
              </div>

              {/* Hold-to-Confirm Button */}
              <div className="flex flex-col gap-3 mt-1">
                <div
                  onMouseDown={() => setIsHolding(true)}
                  onMouseUp={() => setIsHolding(false)}
                  onMouseLeave={() => setIsHolding(false)}
                  onTouchStart={() => setIsHolding(true)}
                  onTouchEnd={() => setIsHolding(false)}
                  className="relative overflow-hidden w-full h-12 border border-rose-600 dark:border-rose-500 bg-white dark:bg-[#1A1A1A] flex items-center justify-center text-rose-600 dark:text-rose-400 text-[13px] font-bold tracking-wide cursor-pointer select-none touch-manipulation transition-transform"
                >
                  <motion.div
                    style={{ width: `${holdProgress}%` }}
                    className="absolute inset-0 bg-rose-600 dark:bg-rose-500 pointer-events-none"
                    transition={{ ease: 'linear' }}
                  />
                  <span
                    className={`relative z-10 transition-colors ${
                      holdProgress > 45 ? 'text-white' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {holdProgress >= 100
                      ? 'Erasing workspace data...'
                      : isHolding
                      ? `Hold to erase · ${(2.5 * (1 - holdProgress / 100)).toFixed(1)}s`
                      : 'Hold to erase · 2.5s'}
                  </span>
                </div>

                {/* Cancel Link */}
                <button
                  type="button"
                  onClick={() => {
                    setIsHolding(false);
                    setShowResetModal(false);
                  }}
                  className="w-full py-1 text-[13px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      
      {/* Re-trigger Onboarding Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={() => updateProfile({ onboardingCompleted: false })}
          className="px-4 py-2 border border-[#D8D8D8] dark:border-[#333333] text-[12px] font-bold uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F4F4F4] dark:hover:bg-[#1A1A1A] transition-colors rounded-none"
        >
          View Onboarding
        </button>
      </div>

      {/* Batch Join / Sync Modal */}

      {pendingBatchKey && matchedBatchData && (
        <Modal
          isOpen={pendingBatchKey !== null}
          onClose={() => setPendingBatchKey(null)}
          title="Active Batch Timetable Found"
          description="A shared timetable already exists for this college, branch, and semester."
        >
          <div className="flex flex-col gap-4 mt-3 text-left">
            <div className="p-4 border border-black dark:border-white bg-black/5 dark:bg-white/5 flex flex-col gap-2">
              <h4 className="text-sm font-bold text-black dark:text-white">
                {matchedBatchData.college}
              </h4>
              <p className="text-xs text-black/75 dark:text-white/75 font-medium">
                {matchedBatchData.programme} - {matchedBatchData.branch} (Sem {matchedBatchData.semester})
              </p>
              <div className="h-px bg-black/20 dark:bg-white/20 my-1" />
              <div className="flex items-center justify-between text-[11px] font-mono opacity-70">
                <span>Created by: {matchedBatchData.creatorName}</span>
                <span>Synced: {matchedBatchData.studentCount || 1} students</span>
              </div>
            </div>

            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
              Joining will download the batch subjects and classes, overwriting your current timetable. You will receive real-time updates when schedule changes occur.
            </p>

            <div className="flex gap-2.5 justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setPendingBatchKey(null);
                  updateProfile({
                    name: name.trim(),
                    rollNumber: rollNumber.trim(),
                    email: email.trim(),
                    year: Number(year),
                    college: college.trim(),
                    programme: programme.trim(),
                    branch: branch.trim(),
                    semester: Number(semester),
                    batchKey: undefined,
                    isBatchSynced: false,
                  });
                  showToast('Profile Saved', 'Saved manually without syncing to batch.', 'success');
                }}
                className="px-4 py-2 border border-black dark:border-white text-xs font-bold uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-none"
              >
                Keep Local
              </button>
              <button
                type="button"
                onClick={async () => {
                  setPendingBatchKey(null);
                  await joinBatchTimetable(pendingBatchKey);
                }}
                className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-xs font-bold uppercase hover:bg-transparent hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-none"
              >
                Sync & Join Batch
              </button>
            </div>
          </div>
        </Modal>
      )}

      
            {/* NOTIFICATION SETTING MODAL */}
      <Modal
        isOpen={showSettingModal}
        onClose={() => setShowSettingModal(false)}
        title={
          activeSetting === 'classReminder' ? 'Class Reminder' :
          activeSetting === 'eveningCheck' ? 'Evening Bag Check' :
          'Homework Early Warning'
        }
      >
        <div className="p-5 flex flex-col gap-5">
          {activeSetting === 'classReminder' && (
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">Remind me before class</span>
              <div className="grid grid-cols-2 gap-2">
                {[5, 10, 15, 30].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      updateSettings({ classReminderMinutes: mins });
                      setShowSettingModal(false);
                      showToast('Updated', 'Class reminder updated', 'success');
                    }}
                    className={`flex items-center gap-2 py-2.5 px-3 border text-[13px] font-bold cursor-pointer ${
                      settings.classReminderMinutes === mins
                        ? 'border-[#111111] dark:border-[#FFFFFF] bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111]'
                        : 'border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#1A1A1A] text-[#111111] dark:text-[#FFFFFF]'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full border ${settings.classReminderMinutes === mins ? 'border-[#FFFFFF] dark:border-[#111111] bg-[#FFFFFF] dark:bg-[#111111]' : 'border-[#A0A0A0] bg-transparent'}`} />
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSetting === 'eveningCheck' && (
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">Daily evening check time</span>
              <div className="flex flex-col gap-2">
                <input
                  type="time"
                  value={settings.eveningCarryReminderTime}
                  onChange={(e) => {
                    updateSettings({ eveningCarryReminderTime: e.target.value });
                  }}
                  className="w-full px-3.5 py-3 bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingModal(false);
                    showToast('Updated', 'Evening reminder updated', 'success');
                  }}
                  className="w-full mt-2 py-2.5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Save Time
                </button>
              </div>
            </div>
          )}

          {activeSetting === 'hwWarning' && (
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#A0A0A0]">Days before deadline</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[1, 2, 3, 5].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      updateSettings({ homeworkWarningDays: days });
                      setShowSettingModal(false);
                      showToast('Updated', 'Homework warning updated', 'success');
                    }}
                    className={`flex items-center gap-2 py-2.5 px-3 border text-[13px] font-bold cursor-pointer ${
                      settings.homeworkWarningDays === days
                        ? 'border-[#111111] dark:border-[#FFFFFF] bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111]'
                        : 'border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#1A1A1A] text-[#111111] dark:text-[#FFFFFF]'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full border ${settings.homeworkWarningDays === days ? 'border-[#FFFFFF] dark:border-[#111111] bg-[#FFFFFF] dark:bg-[#111111]' : 'border-[#A0A0A0] bg-transparent'}`} />
                    {days} {days === 1 ? 'day' : 'days'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* AVATAR SELECTION MODAL */}
      <Modal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="Choose Avatar"
      >
        <div className="p-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {[...['Felix', 'Oliver', 'Jack', 'Leo', 'Max', 'Sam', 'Tom', 'Alex', 'Ryan', 'David'], ...['Mia', 'Lily', 'Zoe', 'Ava', 'Emma', 'Ruby', 'Sara', 'Maya', 'Luna', 'Cleo']].map((seed) => (
              <button
                key={seed}
                type="button"
                onClick={() => handleAvatarSelect(seed)}
                className={`aspect-square bg-[#FFFFFF] dark:bg-[#1A1A1A] border ${avatarSeed === seed ? 'border-[#111111] dark:border-[#FFFFFF] ring-1 ring-[#111111] dark:ring-[#FFFFFF]' : 'border-[#D8D8D8] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF]'} flex items-center justify-center p-2 transition-all cursor-pointer`}
              >
                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=transparent`} className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* CLOUD SYNC MODAL */}
      <Modal
        isOpen={showCloudSyncModal}
        onClose={() => setShowCloudSyncModal(false)}
        title="Account & Cloud Sync"
      >
        <div className="p-5 flex flex-col gap-6">
          {user ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border border-[#D8D8D8] dark:border-[#333333] flex items-center justify-center overflow-hidden bg-[#F4F4F4] dark:bg-[#1A1A1A]">
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}&backgroundColor=transparent`} className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-none">
                    {user.fullName || profile.name || 'Student'}
                  </span>
                  <span className="text-[13px] text-[#6F6F6F]">
                    {user.primaryEmailAddress?.emailAddress || profile.email}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 p-4 border border-[#D8D8D8] dark:border-[#333333] bg-[#F9F9F9] dark:bg-[#1A1A1A]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[12px] font-bold uppercase tracking-widest text-[#111111] dark:text-[#FFFFFF]">Cloud Active</span>
                </div>
                <p className="text-[13px] text-[#6F6F6F] leading-snug">
                  Your timetable, tasks and bag are synced to your cloud account.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => { setShowCloudSyncModal(false); handleExportBackup(); }}
                  className="w-full py-3 border border-[#D8D8D8] dark:border-[#333333] text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] flex items-center justify-center gap-2 hover:bg-[#F4F4F4] dark:hover:bg-[#1A1A1A] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export data
                </button>
                <button 
                  onClick={async () => {
                    await signOut(auth);
                    setShowCloudSyncModal(false);
                    showToast('Signed Out', 'You have been signed out.', 'info');
                    window.location.href = '/sign-in';
                  }}
                  className="w-full py-3 border border-[#D8D8D8] dark:border-[#333333] text-[13px] font-bold text-red-600 flex items-center justify-center gap-2 hover:bg-[#F4F4F4] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2 p-4 border border-[#D8D8D8] dark:border-[#333333] bg-[#F9F9F9] dark:bg-[#1A1A1A]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[12px] font-bold uppercase tracking-widest text-[#111111] dark:text-[#FFFFFF]">Local Device Mode</span>
                </div>
                <p className="text-[13px] text-[#6F6F6F] leading-snug">
                  You are using Intersemester in local storage mode. Sign in to sync your schedule across devices and link with your batch.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Link
                  href="/sign-in"
                  onClick={() => setShowCloudSyncModal(false)}
                  className="w-full py-3 bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] text-[13px] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity uppercase tracking-wider"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In / Create Account
                </Link>
                <button 
                  onClick={() => { setShowCloudSyncModal(false); handleExportBackup(); }}
                  className="w-full py-3 border border-[#D8D8D8] dark:border-[#333333] text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] flex items-center justify-center gap-2 hover:bg-[#F4F4F4] dark:hover:bg-[#1A1A1A] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export local data
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* BATCH SETTINGS MODAL */}
      <Modal
        isOpen={showBatchSettingsModal}
        onClose={() => { setShowBatchSettingsModal(false); setShowLeaveConfirm(false); }}
        title="Batch Options"
      >
        <div className="p-5 flex flex-col">
          {!showLeaveConfirm ? (
            <>
              <button 
                onClick={() => { setShowBatchSettingsModal(false); setShowBatchMembersModal(true); }}
                className="flex items-center justify-between py-4 border-b border-[#D8D8D8] dark:border-[#333333] hover:opacity-70 transition-opacity text-left"
              >
                <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF]">View members</span>
                <Users className="w-4 h-4 text-[#6F6F6F]" />
              </button>
              
              <button 
                onClick={async () => {
                  setShowBatchSettingsModal(false);
                  try {
                    const code = await shareTimetableWithBatch();
                    const link = `${window.location.origin}/?invite=${code}`;
                    const res = await shareLink({
      title: 'Join our Class Timetable',
      text: 'Hey! 👋 Join our class on Intersemester to get our synced timetable, next class alerts & shared updates:',
      url: link,
      dialogTitle: 'Invite Classmates via',
    });
                    if (res === 'copied') showToast('Invite Link Copied', 'Share this link with your classmates!', 'success');
                  } catch (err) {}
                }}
                className="flex items-center justify-between py-4 border-b border-[#D8D8D8] dark:border-[#333333] hover:opacity-70 transition-opacity text-left"
              >
                <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF]">Copy invite link</span>
                <Share2 className="w-4 h-4 text-[#6F6F6F]" />
              </button>

              <button 
                onClick={() => setShowLeaveConfirm(true)}
                className="flex items-center justify-between py-4 hover:opacity-70 transition-opacity text-left mt-2"
              >
                <span className="text-[14px] font-bold text-red-600">Leave batch</span>
                <LogOut className="w-4 h-4 text-red-600" />
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="p-4 border border-red-600/30 bg-red-600/10 text-red-600 flex flex-col gap-2">
                <span className="text-[14px] font-bold">Are you sure you want to leave?</span>
                <span className="text-[12px] opacity-90 leading-snug">
                  You will no longer receive real-time updates for classes and tasks from this batch.
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 mt-2">
                <button 
                  onClick={() => setShowLeaveConfirm(false)}
                  className="px-4 py-2 border border-[#D8D8D8] dark:border-[#333333] text-[12px] font-bold uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F4F4F4] dark:hover:bg-[#1A1A1A] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowBatchSettingsModal(false);
                    setShowLeaveConfirm(false);
                    disconnectBatchTimetable();
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-[12px] font-bold uppercase tracking-wider hover:bg-red-700 transition-colors"
                >
                  Confirm & Leave
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* BATCH MEMBERS & CR CONTROL MODAL */}

      <BatchMembersModal
        isOpen={showBatchMembersModal}
        onClose={() => setShowBatchMembersModal(false)}
      />
    </div>
  );
};
