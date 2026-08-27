'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useUser, UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { useApp } from '@/context/AppContext';
import { Programme, Branch } from '@/lib/types';
import { storage } from '@/lib/storage';
import { INDIAN_COLLEGES } from '@/lib/colleges';
import { scheduleTestNotification } from '@/lib/localNotifications';
import {
  User,
  GraduationCap,
  Bell,
  Download,
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SettingsView: React.FC = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const {
    profile,
    updateProfile,
    settings,
    updateSettings,
    showToast,
    setShowOnboarding,
    triggerSimulatedAlert,
    resetAllData,
  } = useApp();

  const [name, setName] = useState(profile.name);
  const [college, setCollege] = useState(profile.college);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [suggestedColleges, setSuggestedColleges] = useState<string[]>([]);
  const [isLoadingColleges, setIsLoadingColleges] = useState(false);
  const [rollNumber, setRollNumber] = useState(profile.rollNumber);
  const [email, setEmail] = useState(profile.email);
  const [programme, setProgramme] = useState<string>(
    profile.programme === 'CMIT' ? 'Mtech- CMIT' : (profile.programme || '')
  );
  const [branch, setBranch] = useState<string>(profile.branch || '');
  const [year, setYear] = useState(profile.year);
  const [semester, setSemester] = useState(profile.semester);

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
      }
      setHoldProgress(0);
    }
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [isHolding]);

  const executeReset = async () => {
    setIsHolding(false);
    await resetAllData();
    showToast('Workspace Cleared', 'All schedule and task data has been erased.', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const [classReminderMinutes, setClassReminderMinutes] = useState(settings.classReminderMinutes);
  const [eveningTime, setEveningTime] = useState(settings.eveningCarryReminderTime);
  const [hwDays, setHwDays] = useState(settings.homeworkWarningDays);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      college: college.trim(),
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      email: email.trim(),
      programme,
      branch,
      year: Number(year),
      semester: Number(semester),
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

  const handleTestNotification = async () => {
    await scheduleTestNotification(5);
    showToast('Test Alert Scheduled', 'Close or lock your phone now! Notification arrives in 5 seconds.', 'info');
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
          <h1 className="text-[clamp(3rem,12vw,5.5rem)] font-medium tracking-tight leading-none text-black dark:text-white">
            Settings,<br />Profile
          </h1>
          <p className="text-sm sm:text-base text-black/60 dark:text-white/60 mt-3 font-normal leading-relaxed max-w-md">
            Manage your student identity, reminders, and data preferences.
          </p>
        </div>
        <div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowOnboarding(true)}
            className="flex items-center px-5 py-3 rounded-none border border-black dark:border-white text-black dark:text-white bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-sm font-medium cursor-pointer w-fit"
          >
            Onboarding Wizard
          </motion.button>
        </div>
      </div>

      {/* Student ID Card — Brutalist flat style */}
      <div className="relative overflow-hidden border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black p-6 sm:p-7">
        {/* Watermark */}
        <div className="absolute -right-4 -bottom-8 font-black text-[140px] leading-none opacity-5 select-none pointer-events-none tracking-tighter text-white dark:text-black">
          is
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative w-16 h-16 border-2 border-white/40 dark:border-black/30 flex items-center justify-center font-black text-2xl tracking-tighter shrink-0 overflow-hidden bg-white/10 dark:bg-black/10">
              <SignedIn>
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={name || 'User profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </SignedIn>
              <SignedOut>
                <span>{initials}</span>
              </SignedOut>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white dark:text-black truncate">
                  {name || 'Student Name'}
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-white/40 dark:border-black/30 text-white dark:text-black">
                  Verified
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/80 dark:text-black/70 font-medium mt-0.5 truncate">
                {college || 'University Name'}
              </p>
              <div className="flex items-center gap-2 text-xs text-white/60 dark:text-black/50 font-mono mt-2 flex-wrap">
                <span>{programme} {branch}</span>
                <span>•</span>
                <span>Sem {semester} (Year {year})</span>
                {rollNumber && (
                  <>
                    <span>•</span>
                    <span>Roll #{rollNumber}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Academic Profile Form */}
        <div className="lg:col-span-7 glass-card p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-black/20 dark:border-white/20">
            <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center text-black dark:text-white">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-black dark:text-white tracking-widest uppercase">
              Academic Information
            </h3>
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            {/* College Name */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>College / University</label>
              <div className="relative w-full">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-black dark:border-white">
                  <Building2 className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0" />
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
                    className="w-full bg-transparent text-sm font-medium text-black dark:text-white focus:outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
                  />
                </div>
                {showCollegeDropdown && college.length >= 2 && (
                  <div className="absolute top-full left-0 w-full mt-1 max-h-56 overflow-y-auto bg-white dark:bg-zinc-900 border border-black dark:border-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50">
                    {isLoadingColleges && (
                      <div className="px-4 py-2.5 text-xs font-mono font-medium text-black/50 dark:text-white/50 border-b border-black/5 dark:border-white/5">
                        Searching Indian colleges...
                      </div>
                    )}
                    {suggestedColleges.length > 0 ? (
                      suggestedColleges.map((c) => (
                        <div
                          key={c}
                          onMouseDown={() => { setCollege(c); setShowCollegeDropdown(false); }}
                          className="px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-sm font-medium text-black dark:text-white border-b border-black/5 dark:border-white/5 last:border-0"
                        >
                          {c}
                        </div>
                      ))
                    ) : (
                      !isLoadingColleges && INDIAN_COLLEGES.filter(c => c.toLowerCase().includes(college.toLowerCase())).slice(0, 15).map(c => (
                        <div
                          key={c}
                          onMouseDown={() => { setCollege(c); setShowCollegeDropdown(false); }}
                          className="px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-sm font-medium text-black dark:text-white border-b border-black/5 dark:border-white/5 last:border-0"
                        >
                          {c}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-black/50 dark:text-white/50 font-medium">
                Type 3 letters to search verified universities, or type manually if not found.
              </p>
            </div>

            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Full Name</label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-black dark:border-white">
                <User className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm font-medium text-black dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Roll Number & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Roll Number</label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-black dark:border-white">
                  <User className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0" />
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm font-medium text-black dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Institute Email</label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-black dark:border-white">
                  <Mail className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm font-medium text-black dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Programme & Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Degree / Programme</label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-black dark:border-white">
                  <GraduationCap className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0" />
                  <input
                    type="text"
                    value={programme}
                    onChange={(e) => setProgramme(e.target.value)}
                    placeholder="e.g. B.Tech, B.Sc, MBA, BCA, MBBS"
                    required
                    className="w-full bg-transparent text-sm font-medium text-black dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Branch / Department / Major</label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-black dark:border-white">
                  <Building2 className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0" />
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. Computer Science, Mechanical, Finance"
                    required
                    className="w-full bg-transparent text-sm font-medium text-black dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Year & Semester */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Academic Year</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  required
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Semester</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="mt-2 w-full py-3 rounded-none bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:bg-transparent hover:text-black dark:hover:text-white transition-colors text-sm font-semibold cursor-pointer"
            >
              Save Academic Profile
            </motion.button>
          </form>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Account & Cloud Sync */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-black/20 dark:border-white/20">
              <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center text-black dark:text-white">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white tracking-widest uppercase">
                Account & Cloud Sync
              </h3>
            </div>

            <SignedIn>
              <div className="flex items-center justify-between p-3.5 border border-black/20 dark:border-white/20 bg-white dark:bg-zinc-950">
                <div className="flex items-center gap-3 min-w-0">
                  <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-10 h-10' } }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-black dark:text-white truncate">
                      {user?.fullName || user?.firstName || 'Connected Account'}
                    </span>
                    <span className="text-[11px] text-black/50 dark:text-white/50 font-mono truncate max-w-[170px]">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-emerald-600 text-emerald-700 dark:text-emerald-400 shrink-0">
                  Cloud Active
                </span>
              </div>
            </SignedIn>

            <SignedOut>
              <div className="flex flex-col gap-3 p-4 border border-black/20 dark:border-white/20">
                <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed font-medium">
                  Sign in to backup your schedule and carry list so you never lose your timetable data.
                </p>
                <SignInButton mode="modal">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 rounded-none bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:bg-transparent hover:text-black dark:hover:text-white transition-colors text-xs font-bold cursor-pointer flex items-center justify-center gap-2"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Sign In / Create Account</span>
                  </motion.button>
                </SignInButton>
              </div>
            </SignedOut>
          </div>

          {/* Notification Schedule */}
          <div className="glass-card p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-black/20 dark:border-white/20">
              <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center text-black dark:text-white">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white tracking-widest uppercase">
                Notification Engine
              </h3>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Class Reminder</label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={classReminderMinutes}
                    onChange={(e) => setClassReminderMinutes(Number(e.target.value))}
                    className={inputClass}
                  />
                  <span className="text-[10px] text-black/40 dark:text-white/40 font-medium">Minutes before class</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Evening Bag Check</label>
                  <input
                    type="time"
                    value={eveningTime}
                    onChange={(e) => setEveningTime(e.target.value)}
                    className={inputClass}
                  />
                  <span className="text-[10px] text-black/40 dark:text-white/40 font-medium">Daily evening check</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Homework Early Warning</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={hwDays}
                  onChange={(e) => setHwDays(Number(e.target.value))}
                  className={inputClass}
                />
                <span className="text-[10px] text-black/40 dark:text-white/40 font-medium">Days before deadline</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex-1 py-2.5 rounded-none border border-black dark:border-white text-black dark:text-white text-xs font-semibold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                >
                  Update Schedule
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleTestNotification}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-none border border-black/30 dark:border-white/30 text-black dark:text-white text-xs font-semibold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Test Closed-App Alert (5s)</span>
                </motion.button>
              </div>

              <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 flex items-start gap-2 text-[11px] text-black/60 dark:text-white/60">
                <Info className="w-4 h-4 text-[#8C6B5D] shrink-0 mt-0.5" />
                <span>
                  <strong>Tip for Android:</strong> If alarms don&apos;t sound when the app is swiped away, ensure App Info &rarr; Battery is set to &ldquo;Unrestricted&rdquo; and &ldquo;Allow alarms &amp; reminders&rdquo; is enabled in your phone Settings.
                </span>
              </div>
            </form>
          </div>

          {/* Backup & Privacy */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-black/20 dark:border-white/20">
              <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center text-black dark:text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white tracking-widest uppercase">
                Data & Storage
              </h3>
            </div>

            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed font-medium">
              Your academic timetable and tasks are encrypted and synced to your private account.
            </p>

            <div className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExportBackup}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-black dark:border-white text-xs font-semibold text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </motion.button>

                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-black dark:border-white text-xs font-semibold text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>

              {/* High Friction Reset Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowResetModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Clear All Workspace Data</span>
              </motion.button>
            </div>
          </div>

          {/* Legal, Privacy & Support */}
          <div className="glass-card p-6 flex flex-col gap-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/20 dark:border-white/20">
              <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center text-black dark:text-white">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white tracking-widest uppercase">
                Legal & Support
              </h3>
            </div>

            <div className="flex flex-col gap-0 pt-1">
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
                  className="flex items-center justify-between p-2.5 border-b border-black/10 dark:border-white/10 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-xs font-semibold text-black dark:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-black/50 dark:text-white/50" />
                    <span>{label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
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
              className="relative w-full max-w-md bg-white dark:bg-black border border-black dark:border-white shadow-2xl p-6 sm:p-7 overflow-hidden z-10 text-left flex flex-col gap-4 font-sans"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setIsHolding(false);
                  setShowResetModal(false);
                }}
                className="absolute top-5 right-5 p-1.5 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Warning Icon Header */}
              <div className="w-12 h-12 border border-rose-500 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-black dark:text-white tracking-tight">
                  Erase All Workspace Data?
                </h3>
                <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 leading-relaxed mt-1.5">
                  This action will <strong className="text-rose-600 dark:text-rose-400 font-semibold">permanently erase</strong> all your classes, homework assignments, exams, and custom items, giving you a completely blank workspace.
                </p>
              </div>

              {/* Hold-to-Confirm Button */}
              <div className="flex flex-col gap-2 mt-2">
                <div
                  onMouseDown={() => setIsHolding(true)}
                  onMouseUp={() => setIsHolding(false)}
                  onMouseLeave={() => setIsHolding(false)}
                  onTouchStart={() => setIsHolding(true)}
                  onTouchEnd={() => setIsHolding(false)}
                  className="relative overflow-hidden w-full h-13 border-2 border-rose-500 flex items-center justify-center text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-bold tracking-tight cursor-pointer select-none touch-manipulation active:scale-[0.99] transition-transform"
                >
                  <motion.div
                    style={{ width: `${holdProgress}%` }}
                    className="absolute inset-0 bg-rose-600 pointer-events-none"
                    transition={{ ease: 'linear' }}
                  />
                  <span
                    className={`relative z-10 transition-colors ${
                      holdProgress > 45 ? 'text-white' : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {holdProgress >= 100
                      ? 'Clearing Data...'
                      : isHolding
                      ? `Hold to confirm (${Math.round((100 - holdProgress) / 40)}s)`
                      : 'Press & Hold for 2.5s to Clear'}
                  </span>
                </div>

                <p className="text-[11px] text-center text-black/40 dark:text-white/40 font-medium">
                  {isHolding ? 'Keep holding down until complete...' : 'Deliberate safety hold to prevent accidental data loss.'}
                </p>
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => {
                  setIsHolding(false);
                  setShowResetModal(false);
                }}
                className="w-full py-2.5 border border-black/20 dark:border-white/20 text-xs font-semibold text-black/60 dark:text-white/60 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors cursor-pointer text-center"
              >
                Cancel, Keep My Data
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
