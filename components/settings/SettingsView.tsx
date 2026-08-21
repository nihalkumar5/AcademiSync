'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useApp } from '@/context/AppContext';
import { Programme, Branch } from '@/lib/types';
import { storage } from '@/lib/storage';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Badge } from '../ui/Badge';
import {
  User,
  GraduationCap,
  Bell,
  Download,
  Upload,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  ShieldCheck,
  RefreshCcw,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const {
    profile,
    updateProfile,
    settings,
    updateSettings,
    showToast,
    setShowOnboarding,
  } = useApp();

  const [name, setName] = useState(profile.name);
  const [college, setCollege] = useState(profile.college);
  const [rollNumber, setRollNumber] = useState(profile.rollNumber);
  const [email, setEmail] = useState(profile.email);
  const [programme, setProgramme] = useState<Programme>(profile.programme);
  const [branch, setBranch] = useState<Branch>(profile.branch);
  const [year, setYear] = useState(profile.year);
  const [semester, setSemester] = useState(profile.semester);

  // Auto-sync initial data if empty and Clerk is available
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const clerkName = user.fullName || user.firstName || '';
      const clerkEmail = user.primaryEmailAddress?.emailAddress || '';
      
      let updated = false;
      if (profile.name === 'Student' || !profile.name) {
        setName(clerkName);
        updated = true;
      }
      if (!profile.email) {
        setEmail(clerkEmail);
        updated = true;
      }
      
      // Auto save to profile if it was empty
      if (updated) {
        updateProfile({
          name: clerkName || name,
          email: clerkEmail || email,
        });
      }
    }
  }, [isLoaded, isSignedIn, user]);

  const handleSyncClerk = () => {
    if (user) {
      const clerkName = user.fullName || user.firstName || '';
      const clerkEmail = user.primaryEmailAddress?.emailAddress || '';
      setName(clerkName);
      setEmail(clerkEmail);
      showToast('Synced', 'Fetched details from your account.', 'success');
    } else {
      showToast('Error', 'No account found. Please sign in.', 'error');
    }
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
    showToast('Profile Updated', 'Academic records updated successfully', 'success');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      classReminderMinutes: Number(classReminderMinutes),
      eveningCarryReminderTime: eveningTime,
      homeworkWarningDays: Number(hwDays),
    });
  };

  const handleExportBackup = () => {
    const json = storage.exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academisync_backup_${new Date().toISOString().split('T')[0]}.json`;
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

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all data back to the default curriculum sample?')) {
      storage.resetAll();
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Settings & Profile
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Configure your college batch, notification triggers, and data backup.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowOnboarding(true)}
          className="gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Rerun Onboarding Wizard</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Profile Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Student Academic Profile
              </h3>
            </div>
            {isSignedIn && (
              <button
                type="button"
                onClick={handleSyncClerk}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md"
              >
                <RefreshCcw className="w-3 h-3" />
                <span>Sync Account</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
            <Input
              label="College / University Name"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="e.g. NIT Trichy, VIT Vellore..."
              required
            />
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Roll Number"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                required
              />
              <Input
                label="Institute Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Programme"
                value={programme}
                onChange={(e) => setProgramme(e.target.value as Programme)}
              >
                <option value="B.Tech">B.Tech</option>
                <option value="M.Tech">M.Tech</option>
                <option value="CMIT">CMIT</option>
                <option value="Ph.D">Ph.D</option>
              </Select>

              <Select
                label="Branch / Specialization"
                value={branch}
                onChange={(e) => setBranch(e.target.value as Branch)}
              >
                <option value="CSE">CSE (Computer Science)</option>
                <option value="DSAI">DSAI (Data Science & AI)</option>
                <option value="ECE">ECE (Electronics & Comm)</option>
                <option value="IT">IT (Information Tech)</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Year"
                type="number"
                min={1}
                max={4}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                required
              />
              <Input
                label="Semester"
                type="number"
                min={1}
                max={8}
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                required
              />
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" size="sm">
                Save Academic Profile
              </Button>
            </div>
          </form>
        </div>

        {/* Preferences & Notifications Card */}
        <div className="flex flex-col gap-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <Bell className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Notification Schedule
              </h3>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Class Alert (Minutes Before)"
                  type="number"
                  min={5}
                  max={60}
                  value={classReminderMinutes}
                  onChange={(e) => setClassReminderMinutes(Number(e.target.value))}
                  helperText="Default: 15 mins"
                />

                <Input
                  label="Evening Bag Check (Time)"
                  type="time"
                  value={eveningTime}
                  onChange={(e) => setEveningTime(e.target.value)}
                  helperText="Default: 20:00 (8:00 PM)"
                />
              </div>

              <Input
                label="Homework Warning Threshold (Days Before)"
                type="number"
                min={1}
                max={7}
                value={hwDays}
                onChange={(e) => setHwDays(Number(e.target.value))}
                helperText="Send 1st alert X days before submission"
              />

              <div className="pt-2">
                <Button type="submit" variant="secondary" size="sm">
                  Update Notification Timing
                </Button>
              </div>
            </form>
          </div>

          {/* Data Backup & Restore */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Backup & Privacy
              </h3>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Your academic data is kept safely in local client storage with zero telemetry.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleExportBackup} className="gap-1.5">
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>Export Backup (JSON)</span>
              </Button>

              <label className="inline-flex items-center justify-center font-medium transition-all text-xs px-3 py-2 rounded-lg gap-1.5 h-9 bg-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-zinc-400" />
                <span>Import Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              <Button
                variant="danger"
                size="sm"
                onClick={handleResetData}
                className="gap-1.5 ml-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
