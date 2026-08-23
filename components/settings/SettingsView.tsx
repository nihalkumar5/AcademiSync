'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useUser, UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { useApp } from '@/context/AppContext';
import { Programme, Branch } from '@/lib/types';
import { storage } from '@/lib/storage';
import {
  User,
  GraduationCap,
  Bell,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  RefreshCcw,
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
  Copy,
  Check,
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
  } = useApp();

  const [name, setName] = useState(profile.name);
  const [college, setCollege] = useState(profile.college);
  const [rollNumber, setRollNumber] = useState(profile.rollNumber);
  const [email, setEmail] = useState(profile.email);
  const [programme, setProgramme] = useState<Programme>(profile.programme);
  const [branch, setBranch] = useState<Branch>(profile.branch);
  const [year, setYear] = useState(profile.year);
  const [semester, setSemester] = useState(profile.semester);

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
          return prev + 1.25; // 2 seconds total (100 / (1.25 * 40fps) = 2s)
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

  const executeReset = () => {
    setIsHolding(false);
    storage.resetAll();
    showToast('Reset Complete', 'Workspace restored to default curriculum.', 'info');
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

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl mx-auto w-full pb-12">
      {/* Top Header with Onboarding trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 sm:pt-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1918] dark:text-[#F4F1EA]">
            Settings & Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6D61] dark:text-[#9E958C] mt-1 font-medium">
            Manage your student identity, reminders, and data preferences.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowOnboarding(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#EFEAE2]/80 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#322F2C] text-xs font-semibold text-[#5C4D40] dark:text-[#D1C7BD] hover:bg-[#EAE3DA] transition-all shadow-2xs cursor-pointer w-fit"
        >
          <Sparkles className="w-4 h-4 text-[#8C6B5D]" />
          <span>Rerun Onboarding Wizard</span>
        </motion.button>
      </div>

      {/* Digital Student Pass / ID Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#8C6B5D] via-[#7B5B4E] to-[#63483D] text-white p-6 sm:p-7 shadow-[0_15px_35px_rgba(140,107,93,0.25)] border border-[#A68777]/50">
        {/* Background Monogram Glow Watermark */}
        <div className="absolute -right-8 -bottom-10 font-black text-[140px] leading-none opacity-10 select-none pointer-events-none tracking-tighter">
          is
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            {/* Avatar / Google Profile Image Badge */}
            <div className="relative w-16 h-16 rounded-2xl bg-white/15 border-2 border-white/30 backdrop-blur-md flex items-center justify-center font-black text-2xl tracking-tighter text-white shadow-inner shrink-0 overflow-hidden">
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
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
                  {name || 'Student Name'}
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/25">
                  Verified
                </span>
              </div>

              <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5 truncate">
                {college || 'University Name'}
              </p>

              <div className="flex items-center gap-2 text-xs text-white/70 font-mono mt-2 flex-wrap">
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
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#EFEAE2] dark:border-[#282624]">
            <div className="w-8 h-8 rounded-xl bg-[#EFEAE2] dark:bg-[#2A2724] flex items-center justify-center text-[#8C6B5D]">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#1A1918] dark:text-[#F4F1EA]">
              Academic Information
            </h3>
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            {/* College Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                College / University
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926]">
                <Building2 className="w-4 h-4 text-[#8C7D70] shrink-0" />
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. NIT Trichy, IIT Bombay..."
                  required
                  className="w-full bg-transparent text-sm font-medium text-[#1A1918] dark:text-[#F4F1EA] focus:outline-none placeholder:text-[#9E9084]"
                />
              </div>
            </div>

            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                Full Name
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926]">
                <User className="w-4 h-4 text-[#8C7D70] shrink-0" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm font-medium text-[#1A1918] dark:text-[#F4F1EA] focus:outline-none"
                />
              </div>
            </div>

            {/* Roll Number & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                  Roll Number
                </label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926]">
                  <Hash className="w-4 h-4 text-[#8C7D70] shrink-0" />
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm font-medium text-[#1A1918] dark:text-[#F4F1EA] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                  Institute Email
                </label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926]">
                  <Mail className="w-4 h-4 text-[#8C7D70] shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm font-medium text-[#1A1918] dark:text-[#F4F1EA] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Programme & Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                  Degree Programme
                </label>
                <select
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value as Programme)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-sm font-medium text-[#1A1918] dark:text-[#F4F1EA] focus:outline-none cursor-pointer"
                >
                  <option value="B.Tech">B.Tech</option>
                  <option value="M.Tech">M.Tech</option>
                  <option value="CMIT">CMIT</option>
                  <option value="Ph.D">Ph.D</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                  Branch / Department
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value as Branch)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-sm font-medium text-[#1A1918] dark:text-[#F4F1EA] focus:outline-none cursor-pointer"
                >
                  <option value="CSE">CSE (Computer Science)</option>
                  <option value="DSAI">DSAI (Data Science & AI)</option>
                  <option value="ECE">ECE (Electronics & Comm)</option>
                  <option value="IT">IT (Information Tech)</option>
                </select>
              </div>
            </div>

            {/* Year & Semester */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                  Academic Year
                </label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-sm font-medium text-[#1A1918] dark:text-[#F4F1EA] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                  Semester
                </label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-sm font-medium text-[#1A1918] dark:text-[#F4F1EA] focus:outline-none"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="mt-2 w-full py-3 rounded-2xl bg-[#8C6B5D] hover:bg-[#7B5B4E] text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
            >
              Save Academic Profile
            </motion.button>
          </form>
        </div>

        {/* Right Column: Account & Sync + Notification Schedule + Data Backups */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Cloud Sync & Account Status Card */}
          <div className="p-6 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEAE2] dark:border-[#282624]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EFEAE2] dark:bg-[#2A2724] flex items-center justify-center text-[#8C6B5D]">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#1A1918] dark:text-[#F4F1EA]">
                  Account & Cloud Sync
                </h3>
              </div>
            </div>

            <SignedIn>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8E0D5] dark:border-[#2C2926]">
                <div className="flex items-center gap-3 min-w-0">
                  <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-10 h-10' } }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#1A1918] dark:text-white truncate">
                      {user?.fullName || user?.firstName || 'Connected Account'}
                    </span>
                    <span className="text-[11px] text-[#7A6D61] dark:text-[#9A9188] font-mono truncate max-w-[170px]">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                  Cloud Active
                </span>
              </div>
            </SignedIn>

            <SignedOut>
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8E0D5] dark:border-[#2C2926]">
                <p className="text-xs text-[#6E5643] dark:text-[#A89E94] leading-relaxed font-medium">
                  Sign in to backup your schedule and carry list so you never lose your timetable data.
                </p>
                <SignInButton mode="modal">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 rounded-xl bg-[#8C6B5D] hover:bg-[#785B4E] text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Sign In / Create Account</span>
                  </motion.button>
                </SignInButton>
              </div>
            </SignedOut>
          </div>

          {/* Notification Schedule */}
          <div className="p-6 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#EFEAE2] dark:border-[#282624]">
              <div className="w-8 h-8 rounded-xl bg-[#EFEAE2] dark:bg-[#2A2724] flex items-center justify-center text-[#8C6B5D]">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#1A1918] dark:text-[#F4F1EA]">
                Notification Engine
              </h3>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                    Class Reminder
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={classReminderMinutes}
                    onChange={(e) => setClassReminderMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-sm font-medium text-[#1A1918] dark:text-[#F4F1EA] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#8C7D70] font-medium">Minutes before class</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                    Evening Bag Check
                  </label>
                  <input
                    type="time"
                    value={eveningTime}
                    onChange={(e) => setEveningTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-sm font-medium text-[#1A1918] dark:text-[#F4F1EA] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#8C7D70] font-medium">Daily evening check</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                  Homework Early Warning
                </label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={hwDays}
                  onChange={(e) => setHwDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-sm font-medium text-[#1A1918] dark:text-[#F4F1EA] focus:outline-none"
                />
                <span className="text-[10px] text-[#8C7D70] font-medium">Days before deadline</span>
              </div>

              <div className="flex gap-2 mt-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-[#EFEAE2] hover:bg-[#E4DCCF] dark:bg-[#282522] dark:hover:bg-[#34302C] text-[#5C4838] dark:text-[#D1C7BD] text-xs font-semibold transition-all cursor-pointer border border-[#DFD6CA] dark:border-[#3A3632]"
                >
                  Update Schedule
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => triggerSimulatedAlert('classes')}
                  className="px-4 py-2.5 rounded-2xl bg-[#8C6B5D] hover:bg-[#7B5B4E] text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                  title="Send a sample test notification"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Test Alert</span>
                </motion.button>
              </div>
            </form>
          </div>

          {/* Backup & Privacy */}
          <div className="p-6 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#EFEAE2] dark:border-[#282624]">
              <div className="w-8 h-8 rounded-xl bg-[#EFEAE2] dark:bg-[#2A2724] flex items-center justify-center text-[#8C6B5D]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#1A1918] dark:text-[#F4F1EA]">
                Data & Storage
              </h3>
            </div>

            <p className="text-xs text-[#7A6D61] dark:text-[#9A9188] leading-relaxed font-medium">
              Your academic timetable and tasks are encrypted and synced to your private account.
            </p>

            <div className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExportBackup}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#F4EFE6]/70 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB] hover:bg-[#EAE2D6] transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </motion.button>

                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#F4EFE6]/70 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB] hover:bg-[#EAE2D6] transition-all cursor-pointer">
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

              {/* High Friction Trigger Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowResetModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50/80 hover:bg-rose-100/90 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50 text-xs font-semibold transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Sample Curriculum</span>
              </motion.button>
            </div>
          </div>

          {/* Legal, Privacy & Support Section */}
          <div className="p-6 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#EFEAE2] dark:border-[#282624]">
              <div className="w-8 h-8 rounded-xl bg-[#EFEAE2] dark:bg-[#2A2724] flex items-center justify-center text-[#8C6B5D]">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#1A1918] dark:text-[#F4F1EA]">
                Legal &amp; Support
              </h3>
            </div>

            <div className="flex flex-col gap-1 pt-1">
              <Link
                href="/privacy"
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#FAF8F5] dark:hover:bg-[#201E1C] transition-colors group text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-[#8C6B5D]" />
                  <span>Privacy Policy</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link
                href="/terms"
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#FAF8F5] dark:hover:bg-[#201E1C] transition-colors group text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#8C6B5D]" />
                  <span>Terms &amp; Conditions</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link
                href="/contact"
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#FAF8F5] dark:hover:bg-[#201E1C] transition-colors group text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-[#8C6B5D]" />
                  <span>Contact Support</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link
                href="/delete-data"
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#FAF8F5] dark:hover:bg-[#201E1C] transition-colors group text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#8C6B5D]" />
                  <span>Data Deletion Request</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link
                href="/about"
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#FAF8F5] dark:hover:bg-[#201E1C] transition-colors group text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]"
              >
                <div className="flex items-center gap-2.5">
                  <Info className="w-4 h-4 text-[#8C6B5D]" />
                  <span>About Intersemester (v1.2.0)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Deliberate High-Friction Hold-to-Reset Confirmation Modal */}
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
              className="relative w-full max-w-md bg-[#FAF8F5] dark:bg-[#181716] border border-[#E3DBD0] dark:border-[#2E2B28] rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden z-10 text-left flex flex-col gap-4 font-sans"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setIsHolding(false);
                  setShowResetModal(false);
                }}
                className="absolute top-5 right-5 p-1.5 rounded-full text-[#8C7D70] hover:text-[#1A1918] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Warning Icon Header */}
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900/50 shadow-inner">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA] tracking-tight">
                  Reset All Workspace Data?
                </h3>
                <p className="text-xs sm:text-sm text-[#7A6D61] dark:text-[#9A9188] leading-relaxed mt-1.5">
                  This action will <strong className="text-rose-600 dark:text-rose-400 font-semibold">permanently erase</strong> your custom classes, homework assignments, exams, and attendance history, restoring the sample semester batch.
                </p>
              </div>

              {/* Interactive Hold-to-Confirm Button */}
              <div className="flex flex-col gap-2 mt-2">
                <div
                  onMouseDown={() => setIsHolding(true)}
                  onMouseUp={() => setIsHolding(false)}
                  onMouseLeave={() => setIsHolding(false)}
                  onTouchStart={() => setIsHolding(true)}
                  onTouchEnd={() => setIsHolding(false)}
                  className="relative overflow-hidden w-full h-13 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/80 flex items-center justify-center text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-bold tracking-tight cursor-pointer select-none touch-manipulation shadow-xs active:scale-[0.99] transition-transform"
                >
                  {/* Filling Progress Indicator Layer */}
                  <motion.div
                    style={{ width: `${holdProgress}%` }}
                    className="absolute inset-0 bg-rose-600 dark:bg-rose-600 pointer-events-none"
                    transition={{ ease: 'linear' }}
                  />

                  {/* Button Label with live progress text */}
                  <span
                    className={`relative z-10 transition-colors ${
                      holdProgress > 45 ? 'text-white' : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {holdProgress >= 100
                      ? 'Resetting Data...'
                      : isHolding
                      ? `Hold to confirm (${Math.round((100 - holdProgress) / 40)}s)`
                      : 'Press & Hold for 2.5s to Reset'}
                  </span>
                </div>

                <p className="text-[11px] text-center text-[#9E9084] font-medium">
                  {isHolding ? 'Keep holding down until complete...' : 'Deliberate safety hold to prevent accidental data loss.'}
                </p>
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => {
                  setIsHolding(false);
                  setShowResetModal(false);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-center"
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
