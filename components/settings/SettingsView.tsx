'use client';

import { shareLink, PLAY_STORE_URL } from '@/lib/shareUtils';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useApp } from '@/context/AppContext';
import { getAvatarSrc, AVATAR_GROUPS, FACULTY_AVATAR_GROUPS, getAvatarSeed } from '@/lib/avatar';
import { Capacitor } from '@capacitor/core';
import { Programme, Branch } from '@/lib/types';
import { storage } from '@/lib/storage';
import { INDIAN_COLLEGES, STANDARD_PROGRAMMES, STANDARD_BRANCHES, filterProgrammes, filterBranches, getCanonicalProgramme } from '@/lib/colleges';
import { scheduleTestNotification } from '@/lib/localNotifications';
import { getCanonicalBatchKey, formatBatchDisplayName, isValidProperEmail, getShortCollegeName, normalizeProgrammeName, normalizeBranchName, normalizeSection } from '@/lib/timetableUtils';
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
  Pencil,
  Trash2,
} from '@/components/ui/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { isUserSuperAdmin, isUserFaculty } from '@/lib/adminAuth';
import { BatchMembersModal } from '@/components/batch/BatchMembersModal';
import { BatchDiscoveryModal } from '@/components/batch/BatchDiscoveryModal';
import { ApplyForCRCard } from '@/components/cr/ApplyForCRCard';
import { BatchSetupPromptModal } from '@/components/batch/BatchSetupPromptModal';
import { searchCollegesAsync, CollegeItem } from '@/lib/collegeDirectory';
import { AttendanceSummaryCard } from '@/components/attendance/AttendanceSummaryCard';

// ---------- Layout primitives: one system for every section ----------
const Section = ({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-f3">
    <div className="flex items-end justify-between gap-3 px-0.5">
      <div className="min-w-0">
        <h3 className="text-[17px] font-semibold text-fg leading-tight">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const Group = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`border border-line bg-surface divide-y divide-line-soft ${className}`}>
    {children}
  </div>
);

const rowBase = 'w-full flex items-center gap-f3 px-f4 min-h-[55px] py-f3 text-left';
const rowInteractive = 'cursor-pointer hover:bg-surface-2 transition-colors';

const RowIcon = ({ icon: Icon, tone = 'default' }: { icon: React.ElementType; tone?: 'default' | 'danger' }) => (
  <span
    className={`w-8 h-8 shrink-0 flex items-center justify-center border ${
      tone === 'danger'
        ? 'border-rose-200 dark:border-rose-500/25 text-rose-600 dark:text-rose-400'
        : 'border-line-soft text-fg'
    }`}
  >
    <Icon className="w-4 h-4" strokeWidth={1.75} />
  </span>
);

const RowText = ({ label, hint, tone = 'default' }: { label: string; hint?: string; tone?: 'default' | 'danger' }) => (
  <span className="flex-1 min-w-0">
    <span className={`block text-[15px] font-medium leading-snug ${tone === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-fg'}`}>
      {label}
    </span>
    {hint && <span className="block mt-0.5 text-[13px] text-muted truncate">{hint}</span>}
  </span>
);

const RowValue = ({ children }: { children: React.ReactNode }) => (
  <span className="shrink-0 text-[14px] text-muted flex items-center gap-1.5">
    {children}
    <ChevronRight className="w-4 h-4 text-faint" />
  </span>
);

// Read-only detail line: label left, value right
const Detail = ({ label, value, mono = false, href }: { label: string; value?: string | number | null; mono?: boolean; href?: string }) => (
  <div className="flex items-start justify-between gap-4 px-f4 py-f3">
    <span className="text-[14px] text-muted shrink-0">{label}</span>
    {value ? (
      href ? (
        <a href={href} className={`text-[14px] font-medium text-right text-fg break-all hover:underline underline-offset-2 ${mono ? 'font-mono' : ''}`}>
          {value}
        </a>
      ) : (
        <span className={`text-[14px] font-medium text-right text-fg break-words ${mono ? 'font-mono' : ''}`}>{value}</span>
      )
    ) : (
      <span className="text-[14px] text-faint">Not set</span>
    )}
  </div>
);

const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-ink text-on-ink text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer';
const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 h-10 px-4 border border-line text-fg text-[13px] font-semibold hover:border-line-strong transition-colors cursor-pointer';
const btnText =
  'text-[13px] font-semibold text-fg underline-offset-4 hover:underline cursor-pointer';


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
    restoreBackup,
    currentBatchData,
    searchBatchTimetable,
    joinBatchTimetable,
    shareTimetableWithBatch,
    regenerateBatchCode,
    disconnectBatchTimetable,
  } = useApp();

  const [name, setName] = useState(profile.name);
  const [college, setCollege] = useState(profile.college || '');
  const [isChangingCollege, setIsChangingCollege] = useState(!profile.college);
  const [collegeSearchInput, setCollegeSearchInput] = useState('');
  const [suggestedColleges, setSuggestedColleges] = useState<CollegeItem[]>([]);
  const [isLoadingColleges, setIsLoadingColleges] = useState(false);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [showProgrammeDropdown, setShowProgrammeDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [rollNumber, setRollNumber] = useState(profile.rollNumber);
  const [email, setEmail] = useState(profile.email);
  const [programme, setProgramme] = useState<string>(
    profile.programme === 'CMIT' ? 'Mtech- CMIT' : (profile.programme || '')
  );
  const [branch, setBranch] = useState<string>(profile.branch || '');
  const [year, setYear] = useState(profile.year);
  const [semester, setSemester] = useState<number | string>(profile.semester);
  const [section, setSection] = useState<string>(profile.section || '');
  const [pendingBatchKey, setPendingBatchKey] = useState<string | null>(null);
  const [matchedBatchData, setMatchedBatchData] = useState<any>(null);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [showRegenerateCodeModal, setShowRegenerateCodeModal] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);

  // Faculty state logic
  const isFaculty = isUserFaculty(profile);
  const [facultyTitle, setFacultyTitle] = useState(profile.facultyTitle || 'Prof.');
  const [facultyDepartment, setFacultyDepartment] = useState(profile.facultyDepartment || '');
  const [facultyOfficeRoom, setFacultyOfficeRoom] = useState(profile.facultyOfficeRoom || '');
  const [facultyEmployeeId, setFacultyEmployeeId] = useState(profile.facultyEmployeeId || '');

  // Verification status logic
  const userEmail = user?.primaryEmailAddress?.emailAddress || profile.email || email || '';
  const isSuperAdmin = !!user && isUserSuperAdmin(profile, userEmail);
  const isBatchPilotUser = !isSuperAdmin && !!user && (
    profile.role === 'cr' ||
    (currentBatchData?.creatorId === user?.id) ||
    (currentBatchData?.creatorEmail && currentBatchData.creatorEmail.toLowerCase() === userEmail.toLowerCase()) ||
    (Array.isArray(currentBatchData?.crUserIds) && currentBatchData.crUserIds.includes(user?.id)) ||
    (Array.isArray(currentBatchData?.crEmails) && currentBatchData.crEmails.map((e: string) => String(e).toLowerCase()).includes(userEmail.toLowerCase()))
  );
  const isEduEmail = !!user && !!userEmail.toLowerCase().match(/\.(edu|ac\.in|edu\.in)$/);
  const isStudentVerified = !!(user && profile.college && (profile.isBatchSynced || isEduEmail));

  // Automatically keep local input fields in sync when profile updates (e.g. from joining a batch)
  useEffect(() => {
    setName(profile.name || '');
    setCollege(profile.college || '');
    setIsChangingCollege(!profile.college);
    setRollNumber(profile.rollNumber || '');
    setEmail(profile.email || '');
    setProgramme(profile.programme === 'CMIT' ? 'Mtech- CMIT' : (profile.programme || ''));
    setBranch(profile.branch || '');
    setYear(profile.year || 1);
    setSemester(profile.semester || 1);
    setSection(profile.section || '');
    setFacultyTitle(profile.facultyTitle || 'Prof.');
    setFacultyDepartment(profile.facultyDepartment || '');
    setFacultyOfficeRoom(profile.facultyOfficeRoom || '');
    setFacultyEmployeeId(profile.facultyEmployeeId || '');
  }, [profile.college, profile.programme, profile.branch, profile.semester, profile.section, profile.name, profile.rollNumber, profile.email, profile.year, profile.facultyTitle, profile.facultyDepartment, profile.facultyOfficeRoom, profile.facultyEmployeeId]);

  // Debounced SheerID + popular campus search lookup
  useEffect(() => {
    let isMounted = true;
    const delayDebounce = setTimeout(async () => {
      setIsLoadingColleges(true);
      try {
        const results = await searchCollegesAsync(collegeSearchInput);
        if (isMounted) setSuggestedColleges(results);
      } catch (err) {
        console.error('Failed to fetch colleges from SheerID:', err);
      } finally {
        if (isMounted) setIsLoadingColleges(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounce);
    };
  }, [collegeSearchInput]);

  // High-friction Reset Modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [showBatchMembersModal, setShowBatchMembersModal] = useState(false);
  const [showBatchSettingsModal, setShowBatchSettingsModal] = useState(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showBatchSetupPrompt, setShowBatchSetupPrompt] = useState(false);
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile.name || '');
  const [avatarSeed, setAvatarSeed] = useState(getAvatarSeed(profile));
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  // Faculty pick from formal characters; students from the campus set
  const avatarGroups = profile.role === 'faculty' ? FACULTY_AVATAR_GROUPS : AVATAR_GROUPS;
  const [avatarTab, setAvatarTab] = useState<string>(
    () => avatarGroups.find((g) => g.seeds.includes(profile.avatarUrl || ''))?.label || avatarGroups[0].label
  );
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

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      showToast('Email Required', 'Please enter your academic or personal email address.', 'error');
      return;
    }

    if (!isValidProperEmail(cleanEmail)) {
      showToast('Invalid Email', 'Please enter a valid official or personal email address (e.g. name@college.edu.in or name@gmail.com).', 'error');
      return;
    }

    const cleanSec = normalizeSection(section);
    const savedFields = {
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      email: cleanEmail,
      year: Number(year),
      section: cleanSec,
    };

    if (isFaculty) {
      updateProfile({
        name: name.trim(),
        college: (college || '').trim(),
        email: cleanEmail,
        facultyTitle: facultyTitle.trim(),
        facultyDepartment: facultyDepartment.trim(),
        facultyOfficeRoom: facultyOfficeRoom.trim(),
        facultyEmployeeId: facultyEmployeeId.trim(),
      });
      showToast('Profile Saved', 'Faculty details updated successfully', 'success');
      setIsEditingAcademic(false);
      return;
    }

    if (profile.isBatchSynced) {
      updateProfile({
        ...profile,
        ...savedFields,
        isBatchSynced: true,
      });
      showToast('Profile Saved', 'Personal & roll details updated successfully', 'success');
      setIsEditingAcademic(false);
      return;
    }

    const cleanCollege = college.trim();
    const cleanProg = getCanonicalProgramme(programme.trim());
    const cleanBranch = branch.trim();
    const cleanSem = Number(semester);

    if (!cleanCollege) {
      showToast('College Required', 'Please select your verified university from the SheerID directory.', 'error');
      setIsChangingCollege(true);
      setShowCollegeDropdown(true);
      return;
    }

    const hasAcademicChanges = 
      cleanCollege !== profile.college ||
      cleanProg !== profile.programme ||
      cleanBranch !== profile.branch ||
      cleanSem !== profile.semester;

    if (hasAcademicChanges) {
      const cleanCollegeKey = getShortCollegeName(cleanCollege).toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanProgKey = normalizeProgrammeName(cleanProg);
      const cleanBranchKey = normalizeBranchName(cleanBranch);
      const newKey = getCanonicalBatchKey(cleanCollege, cleanProg, cleanBranch, cleanSem);

      // Check if user is ALREADY synced to this exact batch (prevent false re-sync / discovery prompt!)
      const isAlreadyInCurrentBatch = profile.isBatchSynced && (
        profile.batchKey === newKey ||
        (currentBatchData && (
          currentBatchData.id === newKey ||
          currentBatchData.id === profile.batchKey ||
          currentBatchData.inviteCode === profile.batchKey ||
          (
            Number(currentBatchData.semester) === cleanSem &&
            normalizeProgrammeName(currentBatchData.programme) === cleanProgKey &&
            normalizeBranchName(currentBatchData.branch) === cleanBranchKey &&
            (
              getShortCollegeName(currentBatchData.college || '').toLowerCase().replace(/[^a-z0-9]/g, '') === cleanCollegeKey ||
              (cleanCollegeKey.includes('iiit') && (currentBatchData.college || '').toLowerCase().includes('iiit')) ||
              (cleanCollegeKey.includes('iit') && (currentBatchData.college || '').toLowerCase().includes('iit')) ||
              (cleanCollegeKey.includes('nit') && (currentBatchData.college || '').toLowerCase().includes('nit'))
            )
          )
        ))
      );

      if (isAlreadyInCurrentBatch) {
        // Silently update profile metadata without disturbing active batch connection or showing sync prompt
        updateProfile({
          ...savedFields,
          college: cleanCollege,
          programme: cleanProg,
          branch: cleanBranch,
          semester: cleanSem,
          section: cleanSec,
          batchKey: currentBatchData?.id || profile.batchKey,
          isBatchSynced: true,
        });
        showToast('Profile Saved', 'Academic records updated successfully', 'success');
        setIsEditingAcademic(false);
        return;
      }

      // If user genuinely changed batch or was not synced, search directory:
      setIsLoadingColleges(true);
      const matched = await searchBatchTimetable(cleanCollege, cleanProg, cleanBranch, cleanSem);
      setIsLoadingColleges(false);
      
      if (matched) {
        // Double check: if matched batch is the same as current batch, don't show modal!
        const isSameAsCurrent = profile.isBatchSynced && (
          matched.id === profile.batchKey ||
          matched.inviteCode === profile.batchKey ||
          (currentBatchData && (
            currentBatchData.id === matched.id ||
            currentBatchData.inviteCode === matched.inviteCode
          ))
        );

        if (isSameAsCurrent) {
          updateProfile({
            ...savedFields,
            college: cleanCollege,
            programme: cleanProg,
            branch: cleanBranch,
            semester: cleanSem,
            section: cleanSec,
            batchKey: matched.id || profile.batchKey,
            isBatchSynced: true,
          });
          showToast('Profile Saved', 'Academic records updated successfully', 'success');
          setIsEditingAcademic(false);
          return;
        }

        setMatchedBatchData(matched);
        setPendingBatchKey(matched.id || matched.inviteCode || newKey);
        return; // Genuine batch switch: pause and prompt user
      } else if (!profile.isBatchSynced && cleanCollege && cleanBranch) {
        // Save profile and trigger Batch Setup / Request Onboarding Prompt
        updateProfile({
          ...savedFields,
          college: cleanCollege,
          programme: cleanProg,
          branch: cleanBranch,
          semester: cleanSem,
          section: cleanSec,
          batchKey: undefined,
          isBatchSynced: false,
        });
        showToast('Profile Saved', 'Academic records updated successfully', 'success');
        setShowBatchSetupPrompt(true);
        setIsEditingAcademic(false);
        return;
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
    setIsEditingAcademic(false);
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



  // ---------- Backup ----------
  const LAST_EXPORT_KEY = 'intersemester_last_backup_at';
  const [lastExportAt, setLastExportAt] = useState<string | null>(() => {
    try { return typeof window !== 'undefined' ? window.localStorage.getItem(LAST_EXPORT_KEY) : null; } catch { return null; }
  });
  const [pendingImport, setPendingImport] = useState<{ data: any; fileName: string } | null>(null);

  const handleExportBackup = async () => {
    const json = storage.exportBackup();
    const fileName = `intersemester-backup-${new Date().toISOString().split('T')[0]}.json`;
    try {
      if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
        // Android WebView can't download blobs: hand the backup to the share sheet (Drive, Files, WhatsApp...)
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: fileName, text: json, dialogTitle: 'Save your backup' });
      } else {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      const at = new Date().toISOString();
      try { window.localStorage.setItem(LAST_EXPORT_KEY, at); } catch {}
      setLastExportAt(at);
      showToast('Backup saved', fileName, 'success');
    } catch (err: any) {
      if (/cancel|dismiss|abort/i.test(String(err?.message || err?.name || ''))) return;
      showToast('Backup failed', 'Could not save the backup file.', 'error');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large', 'Backups are usually well under 5 MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ''));
        const known = ['subjects', 'timetable', 'homework', 'exams', 'events', 'carryItems', 'settings', 'profile'];
        if (!data || typeof data !== 'object' || !known.some((k) => k in data)) throw new Error('not a backup');
        setPendingImport({ data, fileName: file.name });
      } catch {
        showToast("Can't read this file", 'Choose a backup exported from Intersemester.', 'warning');
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    restoreBackup(pendingImport.data);
    setPendingImport(null);
    showToast('Backup restored', 'Your classes, tasks and exams are back.', 'success');
  };

  const formatBackupDate = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const initials = ((name || profile?.name || 'Student')
    .trim()
    .split(/\s+/)
    .map((n) => (n && n[0] ? n[0] : ''))
    .join('')
    .substring(0, 2) || 'ST')
    .toUpperCase();

  // Shared input class for the brutalist theme
  const inputClass =
    'w-full px-3.5 py-2.5 bg-surface border border-line text-sm font-medium text-fg focus:outline-none focus:border-line-strong placeholder:text-black/30 dark:placeholder:text-[#71717A]';

  const labelClass = 'text-[11px] font-bold tracking-widest uppercase text-muted';

  const handleSignOut = async () => {
    setShowCloudSyncModal(false);
    try {
      if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
        try {
          const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
          GoogleAuth.initialize({
            clientId: '941128003754-5oalodujnbtlr19jsf9t4unqq4762hsm.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
          });
          await GoogleAuth.signOut().catch(() => {});
        } catch (e) {
          console.warn('Native GoogleAuth signOut ignored:', e);
        }
      }
      await signOut(auth).catch((e) => console.warn('Firebase signOut ignored:', e));
      showToast('Signed Out', 'You have been signed out.', 'info');
    } catch (e) {
      console.warn('Sign out error:', e);
    }
  };

  const isCampusAdmin = !!user && !isSuperAdmin && profile.role === 'campus_admin';
  const roleBadge = isSuperAdmin
    ? { label: 'Admin', icon: Crown }
    : isCampusAdmin
    ? { label: 'Campus Admin', icon: Building2 }
    : isFaculty
    ? { label: 'Faculty', icon: GraduationCap }
    : isBatchPilotUser
    ? { label: 'Batch Pilot', icon: Crown }
    : isStudentVerified
    ? { label: 'Verified', icon: ShieldCheck }
    : null;

  const displayName = isFaculty ? `${facultyTitle} ${name || 'Faculty'}` : name || user?.fullName || 'Student';
  const subtitle = isFaculty
    ? [facultyDepartment || 'Faculty member', college ? getShortCollegeName(college) : ''].filter(Boolean).join(' · ')
    : [programme, branch].filter(Boolean).join(' · ') || college || 'Add your academic details';

  const handleShareBatchCode = async () => {
    try {
      const code = await shareTimetableWithBatch();
      const batchTitle = `${profile.branch || 'Class'} (Sem ${profile.semester || ''})`;
      const shareText = `🔥 *Join our official ${batchTitle} Timetable on Intersemester!*

🔑 *Batch Code:* ${code}

⚡ Realtime Class Cancellation & Reschedule Alerts
📅 Live Exam Schedule, Room Numbers & Lab Sessions

📲 *Download App on Play Store:*
${PLAY_STORE_URL}

👉 Open Intersemester App → Tap *Connect Batch* → Enter Code: *${code}*`;

      const res = await shareLink({
        title: 'Join our Class Timetable',
        text: shareText,
        dialogTitle: 'Share Batch Code via',
      });
      if (res === 'copied') showToast('Code Copied', `Batch code copied: ${code}`, 'success');
    } catch (err) {}
  };

  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left w-full max-w-5xl mx-auto overflow-x-hidden">
      {/* Page header */}
      <header>
        <h2 className="page-title">Profile</h2>
        <p className="mt-1.5 text-[14px] text-muted">Your identity, batch and app preferences.</p>
      </header>

      {/* Identity card */}
      <div className="sheen-ink relative overflow-hidden bg-[#111111] dark:bg-[#15171D] dark:border dark:border-white/[0.08] text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 90% at 100% 0%, black 10%, transparent 70%)',
            maskImage: 'radial-gradient(ellipse 80% 90% at 100% 0%, black 10%, transparent 70%)',
          }}
        />
        <div className="relative p-5 sm:p-6 flex items-center gap-4 sm:gap-5">
          <button
            type="button"
            onClick={() => setShowAvatarModal(true)}
            aria-label="Change character"
            className="group relative shrink-0 cursor-pointer"
          >
            <span className="block w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] rounded-full overflow-hidden bg-[#F4F4F6]">
              <img src={getAvatarSrc(avatarSeed)} alt="" className="w-full h-full object-cover scale-110 translate-y-1" />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-white text-[#111111] border-2 border-[#111111] dark:border-[#15171D] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Pencil className="w-3.5 h-3.5" strokeWidth={2.25} />
            </span>
          </button>

          <div className="min-w-0 flex-1">
            {roleBadge && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-white/70">
                <roleBadge.icon className="w-3.5 h-3.5" />
                {roleBadge.label}
              </span>
            )}
            <h3 className="mt-1 text-[22px] sm:text-[26px] font-semibold leading-tight tracking-tight break-words">{displayName}</h3>
            <p className="mt-1 text-[14px] text-white/65 truncate">{subtitle}</p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 border-t border-white/10 divide-x divide-white/10">
          {(isFaculty
            ? [
                { k: 'Batches', v: String(profile.facultyLinkedBatches?.length || 0) },
                { k: 'Cabin', v: facultyOfficeRoom || '—' },
                { k: 'ID', v: facultyEmployeeId || '—' },
              ]
            : [
                { k: 'Semester', v: String(semester || 1) },
                { k: 'Year', v: String(year || 1) },
                { k: 'Roll no.', v: rollNumber || '—' },
              ]
          ).map(({ k, v }) => (
            <div key={k} className="px-4 py-3 min-w-0">
              <p className="text-[11px] uppercase tracking-[1.2px] text-white/50">{k}</p>
              <p className="mt-0.5 text-[15px] font-semibold truncate">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-f5 sm:gap-f6 items-start">
        {/* Left column */}
        <div className="lg:col-span-7 flex flex-col gap-f5 sm:gap-f6">
          <Section
            title={isFaculty ? 'Faculty details' : 'Academic details'}
            action={
              !isEditingAcademic && (
                <button type="button" onClick={() => setIsEditingAcademic(true)} className={`${btnText} inline-flex items-center gap-1.5`}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )
            }
          >
            {!isEditingAcademic ? (
              <Group>
                {isFaculty ? (
                  <>
                    <Detail label="Name" value={`${facultyTitle} ${name || ''}`.trim()} />
                    <Detail label="College" value={college} />
                    <Detail label="Department" value={facultyDepartment} />
                    <Detail label="Cabin" value={facultyOfficeRoom} mono />
                    <Detail label="Employee ID" value={facultyEmployeeId} mono />
                    <Detail label="Email" value={email} href={email ? `mailto:${email}` : undefined} />
                  </>
                ) : (
                  <>
                    <Detail label="Name" value={name} />
                    <Detail label="College" value={college} />
                    <Detail label="Programme" value={programme} />
                    <Detail label="Branch" value={branch} />
                    {profile.section && <Detail label="Section" value={profile.section} />}
                    <Detail label="Roll number" value={rollNumber} mono />
                    <Detail label="Email" value={email} href={email ? `mailto:${email}` : undefined} />
                  </>
                )}
              </Group>
            ) : (
              <div className="border border-line bg-surface p-4 sm:p-5">
                {isFaculty ? (
                <form onSubmit={async (e) => { 
                  await handleSaveProfile(e); 
                  setIsEditingAcademic(false); 
                }} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1.5 sm:col-span-1">
                      <label className="section-label">Title</label>
                      <select
                        value={facultyTitle}
                        onChange={(e) => setFacultyTitle(e.target.value)}
                        className="px-3.5 py-2.5 bg-surface border border-line text-sm font-semibold text-fg focus:outline-none"
                      >
                        {['Prof.', 'Dr.', 'Asst. Prof.', 'Assoc. Prof.', 'Lecturer'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-3">
                      <label className="section-label">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        required
                        className="px-3.5 py-2.5 bg-surface border border-line text-sm font-medium text-fg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="section-label">College / University</label>
                    <input
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="e.g. Bennett University"
                      required
                      className="px-3.5 py-2.5 bg-surface border border-line text-sm font-medium text-fg focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="section-label">Department</label>
                      <input
                        type="text"
                        value={facultyDepartment}
                        onChange={(e) => setFacultyDepartment(e.target.value)}
                        placeholder="e.g. Computer Science &amp; Engineering"
                        className="px-3.5 py-2.5 bg-surface border border-line text-sm font-medium text-fg focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="section-label">Cabin / Office Room</label>
                      <input
                        type="text"
                        value={facultyOfficeRoom}
                        onChange={(e) => setFacultyOfficeRoom(e.target.value)}
                        placeholder="e.g. Block C, Room 304"
                        className="px-3.5 py-2.5 bg-surface border border-line text-sm font-medium text-fg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="section-label">Employee ID</label>
                      <input
                        type="text"
                        value={facultyEmployeeId}
                        onChange={(e) => setFacultyEmployeeId(e.target.value)}
                        placeholder="e.g. FAC-204"
                        className="px-3.5 py-2.5 bg-surface border border-line text-sm font-medium text-fg focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="section-label">Official Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="faculty@college.edu.in"
                        className="px-3.5 py-2.5 bg-surface border border-line text-sm font-medium text-fg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <button type="submit" className="bg-ink text-on-ink px-5 h-11 text-[14px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm">
                      Save Faculty Profile
                    </button>
                    <button type="button" onClick={() => setIsEditingAcademic(false)} className="px-4 h-11 text-[14px] font-semibold text-muted hover:text-fg transition-colors cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </form>
                ) : (
                <form onSubmit={async (e) => { 
                  await handleSaveProfile(e); 
                  setIsEditingAcademic(false); 
                }} className="flex flex-col gap-5">
                  {profile.isBatchSynced ? (
                    <>
                      {/* Locked Batch Banner */}
                      <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/25">
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
                              Synced with Batch
                            </span>
                            <span className="text-[13px] font-semibold text-fg">
                              {profile.college || college} · {profile.branch || branch || profile.programme} (Sem {profile.semester || semester})
                            </span>
                          </div>
                        </div>
                        <span className="text-[12px] font-mono font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5">
                          Locked
                        </span>
                      </div>

                      {/* Full Name */}
                      <div className="flex flex-col gap-1.5">
                        <label className="section-label">Full Name</label>
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface border border-line">
                          <User className="w-4 h-4 text-[#6B6B6B] shrink-0" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your full name"
                            required
                            className="w-full bg-transparent text-[14px] font-medium text-fg focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#71717A]"
                          />
                        </div>
                      </div>

                      {/* Roll Number & Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="section-label">Roll Number</label>
                          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface border border-line">
                            <Hash className="w-4 h-4 text-muted shrink-0" />
                            <input
                              type="text"
                              value={rollNumber}
                              onChange={(e) => setRollNumber(e.target.value)}
                              placeholder="e.g. 23101004"
                              required
                              className="w-full bg-transparent text-[14px] font-medium text-fg focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="section-label">Institute Email</label>
                          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface border border-line">
                            <Mail className="w-4 h-4 text-muted shrink-0" />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="name@college.edu.in"
                              required
                              className="w-full bg-transparent text-[14px] font-medium text-fg focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section (Optional) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="section-label">Section (Optional)</label>
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-line h-[44px]">
                          <input
                            type="text"
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                            placeholder="e.g. A, B"
                            className="w-full bg-transparent text-[14px] font-medium text-fg focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#71717A]"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Full Name */}
                      <div className="flex flex-col gap-1.5">
                        <label className="section-label">Full Name</label>
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface border border-line">
                          <User className="w-4 h-4 text-[#6B6B6B] shrink-0" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your full name"
                            required
                            className="w-full bg-transparent text-[14px] font-medium text-fg focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#71717A]"
                          />
                        </div>
                      </div>

                      {/* College Name (Strict Verification) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="section-label">College / University</label>
                        <div className="relative w-full">
                          {college && !isChangingCollege ? (
                            <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface border border-line">
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-[13px] font-bold text-fg truncate">{college}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsChangingCollege(true);
                                  setShowCollegeDropdown(true);
                                }}
                                className="text-[12px] font-bold text-fg hover:underline shrink-0 ml-3 cursor-pointer"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface border border-line-strong">
                                <Building2 className="w-4 h-4 text-[#6B6B6B] shrink-0" />
                                <input
                                  type="text"
                                  value={collegeSearchInput}
                                  onChange={(e) => {
                                    setCollegeSearchInput(e.target.value);
                                    setShowCollegeDropdown(true);
                                  }}
                                  onFocus={() => setShowCollegeDropdown(true)}
                                  placeholder="Search verified college e.g. IIIT Naya Raipur, VIT, IIT..."
                                  className="w-full bg-transparent text-[13px] font-medium text-fg focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#71717A]"
                                  autoFocus
                                />
                                {college && (
                                  <button
                                    type="button"
                                    onClick={() => setIsChangingCollege(false)}
                                    className="text-[12px] font-bold text-slate-400 hover:text-slate-600 shrink-0"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                              {showCollegeDropdown && (
                                <div className="absolute top-full left-0 w-full mt-1.5 max-h-60 overflow-y-auto bg-surface border border-slate-200 dark:border-white/[0.1] shadow-2xl rounded-none z-50 divide-y divide-slate-100 dark:divide-white/[0.06]">
                                  <div className="p-2 bg-slate-50 dark:bg-zinc-900/80 text-[12px] font-bold text-slate-400 flex items-center justify-between sticky top-0 backdrop-blur-sm">
                                    <span>{isLoadingColleges ? 'Searching verified directory...' : 'Select Your University'}</span>
                                    <span className="text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded-none font-mono font-bold">SheerID Verified</span>
                                  </div>

                                  {suggestedColleges.length > 0 ? (
                                    suggestedColleges.map((item) => (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onMouseDown={() => {
                                          setCollege(item.name);
                                          setIsChangingCollege(false);
                                          setShowCollegeDropdown(false);
                                          setCollegeSearchInput('');
                                        }}
                                        className="w-full px-3.5 py-2.5 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-left transition-colors cursor-pointer flex flex-col"
                                      >
                                        <span className="text-[13px] font-bold text-fg leading-snug">
                                          {item.name}
                                        </span>
                                        {item.state && (
                                          <span className="text-[11px] text-muted">
                                            {item.state}
                                          </span>
                                        )}
                                      </button>
                                    ))
                                  ) : (
                                    !isLoadingColleges && (
                                      <div className="p-4 text-center text-[12px] text-muted">
                                        No matching institutions found. Try typing college name or acronym (e.g. &ldquo;IIIT&rdquo;, &ldquo;IIT&rdquo;, &ldquo;NIT&rdquo;).
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6B6B6B] font-medium mt-0.5">
                          Select your official university from the verified directory to ensure seamless batch syncing.
                        </p>
                      </div>

                      {/* Roll Number & Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="section-label">Roll Number</label>
                          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface border border-line">
                            <Hash className="w-4 h-4 text-muted shrink-0" />
                            <input
                              type="text"
                              value={rollNumber}
                              onChange={(e) => setRollNumber(e.target.value)}
                              required
                              className="w-full bg-transparent text-[14px] font-medium text-fg focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="section-label">Institute Email</label>
                          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface border border-line">
                            <Mail className="w-4 h-4 text-muted shrink-0" />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              className="w-full bg-transparent text-[14px] font-medium text-fg focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Programme & Branch */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="section-label">Degree / Programme</label>
                          <div className="relative w-full">
                            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface border border-line">
                              <GraduationCap className="w-4 h-4 text-muted shrink-0" />
                              <input
                                type="text"
                                value={programme}
                                onChange={(e) => {
                                  setProgramme(e.target.value);
                                  setShowProgrammeDropdown(true);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const matches = filterProgrammes(programme);
                                    if (matches.length > 0) {
                                      e.preventDefault();
                                      setProgramme(matches[0]);
                                      setShowProgrammeDropdown(false);
                                    }
                                  }
                                }}
                                onFocus={() => setShowProgrammeDropdown(true)}
                                onBlur={() => setTimeout(() => setShowProgrammeDropdown(false), 200)}
                                placeholder="e.g. B.Tech, M.Tech, BCA"
                                required
                                className="w-full bg-transparent text-[14px] font-medium text-fg focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#71717A]"
                              />
                            </div>
                            {showProgrammeDropdown && (
                              <div className="absolute top-full left-0 w-full mt-1 max-h-48 overflow-y-auto bg-surface border border-line shadow-2xl z-50">
                                {filterProgrammes(programme).length > 0 ? (
                                  filterProgrammes(programme).map(p => (
                                    <div
                                      key={p}
                                      onMouseDown={() => { setProgramme(p); setShowProgrammeDropdown(false); }}
                                      className="px-4 py-2 hover:bg-surface-2 cursor-pointer text-[13px] font-medium text-fg border-b border-[#D9D9D6] dark:border-white/[0.06] last:border-0"
                                    >
                                      {p}
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-2 text-xs text-muted font-mono">
                                    Press Enter to use custom degree
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="section-label">Major / Branch</label>
                          <div className="relative w-full">
                            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface border border-line">
                              <Building2 className="w-4 h-4 text-muted shrink-0" />
                              <input
                                type="text"
                                value={branch}
                                onChange={(e) => {
                                  setBranch(e.target.value);
                                  setShowBranchDropdown(true);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const matches = filterBranches(branch);
                                    if (matches.length > 0) {
                                      e.preventDefault();
                                      setBranch(matches[0]);
                                      setShowBranchDropdown(false);
                                    }
                                  }
                                }}
                                onFocus={() => setShowBranchDropdown(true)}
                                onBlur={() => setTimeout(() => setShowBranchDropdown(false), 200)}
                                placeholder="e.g. Computer Science"
                                required
                                className="w-full bg-transparent text-[14px] font-medium text-fg focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#71717A]"
                              />
                            </div>
                            {showBranchDropdown && (
                              <div className="absolute top-full left-0 w-full mt-1 max-h-48 overflow-y-auto bg-surface border border-line shadow-2xl z-50">
                                {filterBranches(branch).length > 0 ? (
                                  filterBranches(branch).map(b => (
                                    <div
                                      key={b}
                                      onMouseDown={() => { setBranch(b); setShowBranchDropdown(false); }}
                                      className="px-4 py-2 hover:bg-surface-2 cursor-pointer text-[13px] font-medium text-fg border-b border-[#D9D9D6] dark:border-white/[0.06] last:border-0"
                                    >
                                      {b}
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-2 text-xs text-muted font-mono">
                                    Press Enter to use custom branch
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Year, Semester, Section */}
                      <div className="grid grid-cols-3 gap-3 items-start">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[12px] font-bold text-muted h-4 flex items-center">Year</label>
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-line h-[44px]">
                            <CalendarDays className="w-4 h-4 text-muted shrink-0" />
                            <input
                              type="number"
                              min="1"
                              max="7"
                              value={year}
                              onChange={(e) => setYear(Number(e.target.value))}
                              required
                              className="w-full bg-transparent text-[14px] font-medium text-fg focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[12px] font-bold text-muted h-4 flex items-center">Semester</label>
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-line h-[44px]">
                            <input
                              type="number"
                              min="1"
                              max="14"
                              value={semester}
                              onChange={(e) => setSemester(Number(e.target.value))}
                              placeholder="1-14"
                              required
                              className="w-full bg-transparent text-[14px] font-medium text-fg focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[12px] font-bold text-muted h-4 flex items-center">Section</label>
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-line h-[44px]">
                            <input
                              type="text"
                              value={section}
                              onChange={(e) => setSection(e.target.value)}
                              placeholder="e.g. A, B"
                              className="w-full bg-transparent text-[14px] font-medium text-fg focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#71717A]"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-3 pt-3">
                    <button type="submit" className="bg-ink text-on-ink px-5 h-11 text-[14px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm">
                      {profile.college && profile.branch ? 'Save Changes' : 'Create Profile'}
                    </button>
                    {profile.college && (
                      <button type="button" onClick={() => setIsEditingAcademic(false)} className="px-4 h-11 text-[14px] font-semibold text-muted hover:text-fg transition-colors cursor-pointer">
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
                )}
              </div>
            )}
          </Section>

          {isFaculty ? (
            <>
              <Section title="Attendance" description="Every lecture you've marked, by batch and by student.">
                <AttendanceSummaryCard />
              </Section>
            </>
          ) : (
            <Section title="Batch" description={profile.isBatchSynced ? 'Your class timetable is synced live.' : 'Join your class to get the shared timetable.'}>
              {profile.isBatchSynced ? (
                <Group>
                  <div className="flex items-center gap-3 px-4 py-4">
                    <RowIcon icon={Users} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-semibold text-fg truncate">
                        {[profile.programme, profile.branch].filter(Boolean).join(' · ')}
                      </span>
                      <span className="block mt-0.5 text-[13px] text-muted">
                        Semester {profile.semester} · Year {Math.ceil((profile.semester || 1) / 2)}
                        {profile.section ? ` · Sec ${profile.section}` : ''}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                    </span>
                  </div>

                  {isBatchCR && currentBatchData?.inviteCode && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <span className="flex flex-col">
                        <span className="text-[13px] text-muted">Batch code</span>
                        <span className="text-[18px] font-mono font-semibold tracking-[3px] text-fg select-all">
                          {currentBatchData.inviteCode}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentBatchData.inviteCode);
                          showToast('Code Copied', `Batch code ${currentBatchData.inviteCode} copied to clipboard.`, 'success');
                        }}
                        className={btnSecondary}
                      >
                        Copy
                      </button>
                    </div>
                  )}

                  <button type="button" onClick={() => setShowBatchMembersModal(true)} className={`${rowBase} ${rowInteractive}`}>
                    <RowIcon icon={Users} />
                    <RowText label={isBatchCR ? 'Manage members' : 'Members'} />
                    <RowValue>{null}</RowValue>
                  </button>
                  <button type="button" onClick={handleShareBatchCode} className={`${rowBase} ${rowInteractive}`}>
                    <RowIcon icon={Share2} />
                    <RowText label="Invite batchmates" hint="Share the batch code" />
                    <RowValue>{null}</RowValue>
                  </button>
                  <button type="button" onClick={() => setShowDiscoveryModal(true)} className={`${rowBase} ${rowInteractive}`}>
                    <RowIcon icon={RefreshCw} />
                    <RowText label="Switch batch" />
                    <RowValue>{null}</RowValue>
                  </button>
                  <button type="button" onClick={() => setShowBatchSettingsModal(true)} className={`${rowBase} ${rowInteractive}`}>
                    <RowIcon icon={MoreHorizontal} />
                    <RowText label="Batch settings" hint="Leave batch, regenerate code" />
                    <RowValue>{null}</RowValue>
                  </button>
                </Group>
              ) : (
                <div className="border border-dashed border-line p-5 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <RowIcon icon={Users} />
                    <div>
                      <p className="text-[15px] font-semibold text-fg">No batch connected</p>
                      <p className="mt-0.5 text-[13px] text-muted">
                        Enter your class&apos;s 6-digit code, or set one up as Batch Pilot.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setShowDiscoveryModal(true)} className={btnPrimary}>
                      <Users className="w-4 h-4" /> Connect batch
                    </button>
                    <button type="button" onClick={() => setShowBatchSetupPrompt(true)} className={btnSecondary}>
                      <Crown className="w-4 h-4" /> Set up batch
                    </button>
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 flex flex-col gap-f5 sm:gap-f6">
          {!user && (
            <Section title="Account">
              <Group>
                <>
                  <div className={rowBase}>
                    <RowIcon icon={Cloud} />
                    <RowText label="Local mode" hint="Data stays on this device only" />
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-amber-700 dark:text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Off
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 px-4 py-3.5">
                    <Link href="/sign-in" className={btnPrimary}>
                      <LogIn className="w-4 h-4" /> Sign in to sync
                    </Link>
                    <button type="button" onClick={() => setShowCloudSyncModal(true)} className={btnSecondary}>
                      Learn more
                    </button>
                  </div>
                </>
              </Group>
            </Section>
          )}

          <Section title="Preferences">
            <Group>
              <div className={rowBase}>
                <RowIcon icon={settings.theme === 'dark' ? Moon : Sun} />
                <RowText label="Appearance" />
                <div role="radiogroup" aria-label="Theme" className="flex shrink-0 border border-line p-0.5">
                  {(['light', 'dark'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={settings.theme === t}
                      onClick={() => updateSettings({ theme: t })}
                      className={`h-9 px-3 text-[13px] font-medium capitalize cursor-pointer transition-colors ${
                        settings.theme === t
                          ? 'bg-ink text-on-ink'
                          : 'text-muted hover:text-fg'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => { setActiveSetting('classReminder'); setShowSettingModal(true); }} className={`${rowBase} ${rowInteractive}`}>
                <RowIcon icon={Bell} />
                <RowText label="Class reminder" hint="Before each class starts" />
                <RowValue>{settings.classReminderMinutes ?? 10} min</RowValue>
              </button>
              {!isFaculty && (<>
              <button type="button" onClick={() => { setActiveSetting('eveningCheck'); setShowSettingModal(true); }} className={`${rowBase} ${rowInteractive}`}>
                <RowIcon icon={CalendarDays} />
                <RowText label="Tomorrow's plan" hint="Evening heads-up for the next day" />
                <RowValue>{settings.eveningCarryReminderTime || '20:00'}</RowValue>
              </button>
              <button type="button" onClick={() => { setActiveSetting('hwWarning'); setShowSettingModal(true); }} className={`${rowBase} ${rowInteractive}`}>
                <RowIcon icon={Clock} />
                <RowText label="Task warning" hint="Before a deadline" />
                <RowValue>
                  {settings.homeworkWarningDays ?? 3} day{(settings.homeworkWarningDays ?? 3) === 1 ? '' : 's'}
                </RowValue>
              </button>
              </>)}
            </Group>
          </Section>

          <Section title="Backup & reset" description="Keep a copy of your data, or start over.">
            <Group>
              <button type="button" onClick={handleExportBackup} className={`${rowBase} ${rowInteractive}`}>
                <RowIcon icon={Download} />
                <RowText
                  label="Download backup"
                  hint={lastExportAt ? `Last saved ${formatBackupDate(lastExportAt)}` : 'Save all your data to a file'}
                />
                <RowValue>{null}</RowValue>
              </button>
              <label className={`${rowBase} ${rowInteractive}`}>
                <RowIcon icon={Upload} />
                <RowText label="Restore from backup" hint="Review a backup file, then restore" />
                <RowValue>{null}</RowValue>
                <input type="file" accept=".json,application/json" onChange={handleImportBackup} className="hidden" />
              </label>
              <button type="button" onClick={() => setShowResetModal(true)} className={`${rowBase} ${rowInteractive}`}>
                <RowIcon icon={Trash2} tone="danger" />
                <RowText label="Erase everything" hint={isFaculty ? 'Unlink batches and reset this device' : user ? 'Start fresh on this device and your account' : 'Start fresh on this device'} tone="danger" />
              </button>
            </Group>
          </Section>

          {isCampusAdmin && (
            <Section title="Campus admin">
              <Group>
                <Link href="/campus-admin" className={`${rowBase} ${rowInteractive}`}>
                  <RowIcon icon={Building2} />
                  <RowText label="Campus admin panel" hint="Students, batches, requests and notices for your college" />
                  <RowValue>{null}</RowValue>
                </Link>
              </Group>
            </Section>
          )}

          {isUserSuperAdmin(profile, user?.primaryEmailAddress?.emailAddress) && (
            <Section title="Admin">
              <Group>
                <Link href="/admin" className={`${rowBase} ${rowInteractive}`}>
                  <RowIcon icon={Crown} />
                  <RowText label="Control center" />
                  <RowValue>{null}</RowValue>
                </Link>
              </Group>
            </Section>
          )}

          <Section title="Help & legal">
            <Group>
              {[
                { href: '/contact', icon: MessageSquare, label: 'Contact support' },
                { href: '/privacy', icon: Shield, label: 'Privacy policy' },
                { href: '/terms', icon: FileText, label: 'Terms & conditions' },
                { href: '/delete-data', icon: AlertTriangle, label: 'Request data deletion' },
                { href: '/about', icon: Info, label: 'About Intersemester' },
              ].map(({ href, icon, label }) => (
                <Link key={href} href={href} className={`${rowBase} ${rowInteractive}`}>
                  <RowIcon icon={icon} />
                  <RowText label={label} />
                  <RowValue>{null}</RowValue>
                </Link>
              ))}
            </Group>
          </Section>

          {user && (
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="w-full h-11 inline-flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-[14px] font-semibold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          )}

          <div className="flex items-center justify-between gap-3 px-0.5">
            <span className="text-[13px] text-muted">Version 1.2.0</span>
            <button type="button" onClick={() => updateProfile({ onboardingCompleted: false })} className={btnText}>
              Replay onboarding
            </button>
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
              className="relative w-full max-w-sm bg-surface border border-line shadow-2xl p-6 sm:p-7 overflow-hidden z-10 text-left flex flex-col gap-5 font-sans"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsHolding(false);
                  setShowResetModal(false);
                }}
                className="absolute top-5 right-5 p-1 text-[#6B6B6B] hover:text-fg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Warning Icon Header */}
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-[20px] font-bold text-fg tracking-tight leading-snug">
                  Erase everything?
                </h3>
                
                <div className="text-[13px] text-[#6B6B6B] leading-relaxed flex flex-col gap-2 mt-1">
                  <p className="font-medium">This permanently deletes, {user ? 'here and in your account' : 'on this device'}:</p>
                  <ul className="flex flex-col gap-1 pl-1 text-[#6B6B6B] font-medium">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Classes, subjects and timetable</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Tasks, exams and events</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Bag items and settings</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Profile details (you&apos;ll set up again)</span>
                    </li>
                  </ul>
                  <p className="font-medium mt-1">This can&apos;t be undone. Your batch&apos;s shared timetable isn&apos;t affected. Download a backup first if you might want this back.</p>
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
                  className="relative overflow-hidden w-full h-12 border border-rose-600 dark:border-rose-500 bg-surface flex items-center justify-center text-rose-600 dark:text-rose-400 text-[13px] font-bold tracking-wide cursor-pointer select-none touch-manipulation transition-transform"
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
                  className="w-full py-1 text-[13px] font-medium text-[#6B6B6B] hover:text-fg transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      
      {/* Batch Join / Sync Modal */}

      {pendingBatchKey && matchedBatchData && (
        <Modal
          isOpen={pendingBatchKey !== null}
          onClose={() => setPendingBatchKey(null)}
          title="Active Batch Timetable Found"
          description="A shared timetable already exists for this college, branch, and semester."
        >
          <div className="flex flex-col gap-4 mt-3 text-left">
            <div className="p-4 border border-line bg-surface-2 flex flex-col gap-2">
              <h4 className="text-sm font-bold text-fg">
                {matchedBatchData.college}
              </h4>
              <p className="text-xs text-black/75 dark:text-[#A1A1AA] font-medium">
                {matchedBatchData.programme} - {matchedBatchData.branch} (Sem {matchedBatchData.semester})
              </p>
              <div className="h-px bg-surface-3 my-1" />
              <div className="flex items-center justify-between text-[11px] font-mono opacity-70">
                <span>Created by: {matchedBatchData.creatorName}</span>
                <span>Synced: {matchedBatchData.studentCount || 1} students</span>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
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
                className="px-4 h-9 border border-line text-[13px] font-semibold hover:bg-surface-2 text-fg transition-colors cursor-pointer rounded-none"
              >
                Keep Local
              </button>
              <button
                type="button"
                onClick={async () => {
                  const keyToJoin = matchedBatchData?.id || matchedBatchData?.inviteCode || pendingBatchKey;
                  setPendingBatchKey(null);
                  if (keyToJoin) {
                    await joinBatchTimetable(keyToJoin);
                  }
                }}
                className="px-4 h-9 bg-ink text-on-ink border border-line-strong text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer rounded-none shadow-sm"
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
              <span className="section-label">Remind me before class</span>
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
                    className={`flex items-center gap-2 h-11 px-3 border text-[14px] font-semibold cursor-pointer ${
                      settings.classReminderMinutes === mins
                        ? 'border-line-strong bg-ink text-on-ink'
                        : 'border-line bg-surface text-fg'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full border ${settings.classReminderMinutes === mins ? 'border-[#FFFFFF] dark:border-[#090A0C] bg-surface' : 'border-[#A0A0A0] bg-transparent'}`} />
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSetting === 'eveningCheck' && (
            <div className="flex flex-col gap-3">
              <span className="section-label">Daily evening check time</span>
              <div className="flex flex-col gap-2">
                <input
                  type="time"
                  value={settings.eveningCarryReminderTime}
                  onChange={(e) => {
                    updateSettings({ eveningCarryReminderTime: e.target.value });
                  }}
                  className="w-full px-3.5 py-3 bg-surface border border-line text-[14px] font-bold text-fg focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingModal(false);
                    showToast('Updated', 'Evening reminder updated', 'success');
                  }}
                  className="w-full mt-2 h-11 bg-ink text-on-ink text-[14px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                >
                  Save Time
                </button>
              </div>
            </div>
          )}

          {activeSetting === 'hwWarning' && (
            <div className="flex flex-col gap-3">
              <span className="section-label">Days before deadline</span>
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
                    className={`flex items-center gap-2 h-11 px-3 border text-[14px] font-semibold cursor-pointer ${
                      settings.homeworkWarningDays === days
                        ? 'border-line-strong bg-ink text-on-ink'
                        : 'border-line bg-surface text-fg'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full border ${settings.homeworkWarningDays === days ? 'border-[#FFFFFF] dark:border-[#090A0C] bg-surface' : 'border-[#A0A0A0] bg-transparent'}`} />
                    {days} {days === 1 ? 'day' : 'days'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* CHARACTER PICKER */}
      <Modal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="Choose your character"
      >
        <div className="p-5 flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
          <p className="text-[13px] text-muted">Shown on your profile, in the header and to your batchmates.</p>
          <div role="tablist" aria-label="Character groups" className="grid grid-cols-3 border border-line p-0.5">
            {avatarGroups.map((g) => (
              <button
                key={g.label}
                type="button"
                role="tab"
                aria-selected={avatarTab === g.label}
                onClick={() => setAvatarTab(g.label)}
                className={`h-9 text-[13px] font-medium cursor-pointer transition-colors ${
                  avatarTab === g.label
                    ? 'bg-ink text-on-ink'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label={`${avatarTab} characters`} className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {(avatarGroups.find((g) => g.label === avatarTab)?.seeds || []).map((seed) => {
              const on = avatarSeed === seed;
              return (
                <button
                  key={seed}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`Character ${seed.split('-').pop()}`}
                  onClick={() => handleAvatarSelect(seed)}
                  className={`relative aspect-square rounded-full overflow-hidden bg-[#F1F1EF] dark:bg-[#F4F4F6] transition-all cursor-pointer ring-offset-2 ring-offset-white dark:ring-offset-[#16171D] ${
                    on ? 'ring-2 ring-[#111111] dark:ring-[#F4F4F6]' : 'hover:scale-105'
                  }`}
                >
                  <img src={getAvatarSrc(seed)} alt="" loading="lazy" className="w-full h-full object-cover scale-110 translate-y-1" />
                  {on && (
                    <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#111111] text-white flex items-center justify-center">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Import review: show what's in the file before anything is replaced */}
      <Modal isOpen={!!pendingImport} onClose={() => setPendingImport(null)} title="Restore this backup?">
        {pendingImport && (() => {
          const d = pendingImport.data;
          const n = (v: any) => (Array.isArray(v) ? v.length : '—'); // '—' = not in file, left unchanged
          const rows = [
            { label: 'Classes', value: n(d.timetable) },
            { label: 'Subjects', value: n(d.subjects) },
            { label: 'Tasks', value: n(d.homework) },
            { label: 'Exams', value: n(d.exams) },
            { label: 'Events', value: n(d.events) },
            { label: 'Bag items', value: n(d.carryItems) },
          ];
          const saved = formatBackupDate(d.exportedAt);
          return (
            <div className="p-5 flex flex-col gap-4">
              <div>
                <p className="text-[14px] font-medium text-fg break-all">{pendingImport.fileName}</p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {saved ? `Saved on ${saved}` : 'Date unknown'}{d.profile?.name ? ` · ${d.profile.name}` : ''}
                </p>
              </div>
              <div className="grid grid-cols-3 border-l border-t border-line">
                {rows.map((r) => (
                  <div key={r.label} className="px-3 py-2.5 border-r border-b border-line">
                    <p className="text-[18px] font-semibold tabular-nums text-fg">{r.value}</p>
                    <p className="text-[12px] text-muted">{r.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[13px] leading-relaxed text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 px-3 py-2.5">
                This replaces your current classes, tasks, exams and settings{user ? ' here and in your account' : ''}. Your batch link stays as it is.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={confirmImport} className="flex-1 h-11 bg-ink text-on-ink text-[14px] font-semibold hover:opacity-90 transition-opacity cursor-pointer">
                  Restore
                </button>
                <button type="button" onClick={() => setPendingImport(null)} className="h-11 px-4 border border-line text-[14px] font-semibold text-fg cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Sign-out confirmation: one deliberate extra tap */}
      <ConfirmModal
        isOpen={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={async () => {
          setIsSigningOut(true);
          await handleSignOut();
          setIsSigningOut(false);
          setConfirmSignOut(false);
        }}
        title="Sign out?"
        description="Your data stays saved in your account. Sign in again to see it on this device."
        highlightText={user?.primaryEmailAddress?.emailAddress || profile?.email || undefined}
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        variant="danger"
        isLoading={isSigningOut}
      />

      {/* ACCOUNT MODAL */}
      <Modal
        isOpen={showCloudSyncModal}
        onClose={() => setShowCloudSyncModal(false)}
        title={user ? 'Account' : 'Sync your data'}
      >
        <div className="p-5 flex flex-col gap-5">
          {user ? (
            <>
              <div className="flex items-center gap-3">
                <span className="w-14 h-14 shrink-0 rounded-full overflow-hidden bg-[#F1F1EF] dark:bg-[#F4F4F6]">
                  <img src={getAvatarSrc(avatarSeed)} alt="" className="w-full h-full object-cover scale-110 translate-y-1" />
                </span>
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold text-fg truncate">{user?.fullName || profile?.name || 'Student'}</p>
                  <p className="text-[14px] text-muted truncate">{user?.primaryEmailAddress?.emailAddress || profile?.email}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-emerald-700 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Timetable, tasks and bag are synced
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowCloudSyncModal(false); setConfirmSignOut(true); }}
                className="w-full h-11 inline-flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-[14px] font-semibold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 shrink-0 flex items-center justify-center border border-line-soft text-fg">
                  <Cloud className="w-5 h-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-fg">Your data is only on this device</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted">
                    Sign in to back it up, use it on other devices and join your batch.
                  </p>
                </div>
              </div>
              <Link
                href="/sign-in"
                onClick={() => setShowCloudSyncModal(false)}
                className="btn btn-primary w-full"
              >
                <LogIn className="w-4 h-4" /> Sign in
              </Link>
            </>
          )}
        </div>
      </Modal>

      {/* BATCH SETTINGS MODAL */}
      <Modal
        isOpen={showBatchSettingsModal}
        onClose={() => { setShowBatchSettingsModal(false); setShowLeaveConfirm(false); }}
        title="Batch Options"
        description="Manage your class batch settings and permissions."
        maxWidth="md"
      >
        <div className="p-5 flex flex-col font-sans">
          {!showLeaveConfirm ? (
            <div className="flex flex-col divide-y divide-line-soft">
              <button 
                onClick={() => { setShowBatchSettingsModal(false); setShowBatchMembersModal(true); }}
                className="flex items-center justify-between py-3.5 hover:opacity-75 transition-opacity text-left cursor-pointer group"
              >
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-fg">
                    {isBatchCR ? 'Manage batch members' : 'View batch members'}
                  </span>
                  <span className="text-[12px] text-muted">
                    See students and pilots in your branch
                  </span>
                </div>
                <Users className="w-4 h-4 text-muted" />
              </button>
              
              <button 
                onClick={async () => {
                  setShowBatchSettingsModal(false);
                  try {
                    const code = await shareTimetableWithBatch();
                    const batchTitle = `${profile.branch || 'Class'} (Sem ${profile.semester || ''})`;
                    const shareText = `🔥 *Join our official ${batchTitle} Timetable on Intersemester!*\n\n🔑 *Batch Code:* ${code}\n\n⚡ Realtime Class Cancellation & Reschedule Alerts\n📅 Live Exam Schedule, Room Numbers & Lab Sessions\n\n📲 *Download App on Play Store:*\n${PLAY_STORE_URL}\n\n👉 Open Intersemester App → Tap *Connect Batch* → Enter Code: *${code}*`;

                    const res = await shareLink({
                      title: 'Join our Class Timetable',
                      text: shareText,
                      dialogTitle: 'Share Batch Code via',
                    });
                    if (res === 'copied') showToast('Code Copied', `Batch code copied: ${code}`, 'success');
                  } catch (err) {}
                }}
                className="flex items-center justify-between py-3.5 hover:opacity-75 transition-opacity text-left cursor-pointer group"
              >
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-fg">
                    Copy batch code
                  </span>
                  <span className="text-[12px] text-muted">
                    Copy invite code to share with classmates
                  </span>
                </div>
                <Share2 className="w-4 h-4 text-muted" />
              </button>

              {isBatchCR && (
                <button 
                  onClick={() => {
                    setShowBatchSettingsModal(false);
                    setShowRegenerateCodeModal(true);
                  }}
                  className="flex items-center justify-between py-3.5 hover:opacity-75 transition-opacity text-left cursor-pointer group"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-fg">
                        Regenerate batch code
                      </span>
                      <span className="text-[12px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.5 border border-amber-500/30">
                        Pilot Only
                      </span>
                    </div>
                    <span className="text-[12px] text-muted">
                      Create a new 6-character code; previous code expires
                    </span>
                  </div>
                  <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </button>
              )}

              <button 
                onClick={() => setShowLeaveConfirm(true)}
                className="flex items-center justify-between py-3.5 hover:opacity-75 transition-opacity text-left cursor-pointer group"
              >
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-red-600">
                    Leave batch
                  </span>
                  <span className="text-[12px] text-red-600/70">
                    Disconnect and revert to personal schedule
                  </span>
                </div>
                <LogOut className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="p-4 border border-red-600/30 bg-red-600/10 text-red-600 flex flex-col gap-2">
                <span className="text-[14px] font-bold">Are you sure you want to leave?</span>
                <span className="text-[12px] opacity-90 leading-snug">
                  All batch classes, schedule, and shared tasks will be removed. Your personal custom classes, notes, and private tasks will be preserved.
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 mt-2">
                <button 
                  onClick={() => setShowLeaveConfirm(false)}
                  className="px-4 h-9 border border-line text-[13px] font-semibold text-fg hover:bg-surface-2 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setShowBatchSettingsModal(false);
                    setShowLeaveConfirm(false);
                    await disconnectBatchTimetable();
                  }}
                  className="px-4 h-9 bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 transition-colors cursor-pointer"
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

      {/* BATCH DISCOVERY MODAL */}
      <BatchDiscoveryModal
        isOpen={showDiscoveryModal}
        onClose={() => setShowDiscoveryModal(false)}
        initialTab="code"
      />

      {/* BATCH SETUP & ONBOARDING PROMPT MODAL */}
      <BatchSetupPromptModal
        isOpen={showBatchSetupPrompt}
        onClose={() => setShowBatchSetupPrompt(false)}
        college={college}
        programme={programme}
        branch={branch}
        semester={Number(semester)}
      />

      {/* REGENERATE BATCH CODE CONFIRMATION MODAL */}
      <Modal
        isOpen={showRegenerateCodeModal}
        onClose={() => setShowRegenerateCodeModal(false)}
        title="Regenerate Batch Code"
        description="Create a new invite code for your class batch."
        maxWidth="md"
      >
        <div className="flex flex-col gap-4 p-1 text-left font-sans">
          <div className="p-3.5 bg-surface-2 border border-line-soft flex items-center justify-between">
            <div className="flex flex-col">
              <span className="section-label">Current code</span>
              <span className="text-[16px] font-mono font-bold tracking-[2.5px] text-fg">
                {currentBatchData?.inviteCode || '------'}
              </span>
            </div>
            <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[12px] font-mono font-bold ">
              Will Expire
            </div>
          </div>

          <div className="p-3.5 border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/[0.06] flex flex-col gap-1">
            <span className="text-[12px] font-bold text-amber-700 dark:text-amber-400 ">How this works</span>
            <p className="text-[12px] text-muted leading-relaxed">
              A new official 6-character code will be generated immediately. Existing students who already joined will stay in the batch, but any new students must use the new code.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-2">
            <button
              type="button"
              onClick={() => setShowRegenerateCodeModal(false)}
              disabled={isRegeneratingCode}
              className="px-4 h-9 border border-line text-[13px] font-semibold text-fg hover:bg-surface-2 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isRegeneratingCode}
              onClick={async () => {
                setIsRegeneratingCode(true);
                try {
                  await regenerateBatchCode();
                  setShowRegenerateCodeModal(false);
                } catch (_) {
                  // Handled by showToast in regenerateBatchCode
                } finally {
                  setIsRegeneratingCode(false);
                }
              }}
              className="btn btn-primary btn-sm"
            >
              {isRegeneratingCode ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate Code</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
