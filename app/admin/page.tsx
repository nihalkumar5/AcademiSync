'use client';

import React, { useState, useEffect } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { useApp } from '@/context/AppContext';
import { isUserSuperAdmin } from '@/lib/adminAuth';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, query, orderBy, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PromotionalCampaign, CampaignCategory, AdminRole } from '@/lib/types';
import {
  Shield,
  Users,
  Layers,
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Eye,
  MousePointer,
  CheckCircle2,
  XCircle,
  Search,
  Lock,
  ArrowLeft,
  Sparkles,
  BarChart3,
  Award,
  Crown,
  Tag,
  Film,
  ShoppingBag,
  Calendar,
  AlertTriangle,
  Globe,
  Crosshair,
  Check,
  X
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type AdminTab = 'overview' | 'users' | 'batches' | 'campaigns';

export default function SuperAdminPage() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const { profile, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [batchesList, setBatchesList] = useState<any[]>([]);
  const [campaignsList, setCampaignsList] = useState<PromotionalCampaign[]>([]);

  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchBatchQuery, setSearchBatchQuery] = useState('');

  // Modal for Campaign creation/editing
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    imageUrl: '',
    ctaText: 'Learn More',
    targetUrl: '',
    category: 'general' as CampaignCategory,
    badgeText: '',
    targetAudienceType: 'all' as 'all' | 'custom',
    targetColleges: [] as string[],
    targetBranches: [] as string[],
    targetSemesters: [] as number[],
    customCollegeInput: '',
    customBranchInput: '',
    isActive: true,
  });

  const userEmail = user?.primaryEmailAddress?.emailAddress || '';
  const isAdmin = isUserSuperAdmin(profile, userEmail);

  // 1. Stream Users from Firestore
  useEffect(() => {
    if (!isAdmin) return;
    try {
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const fetched: any[] = [];
        snapshot.forEach((d) => {
          fetched.push({ id: d.id, ...d.data() });
        });
        setUsersList(fetched);
      }, (err) => console.error('Error fetching users:', err));

      return () => unsubscribe();
    } catch (e) {
      console.error(e);
    }
  }, [isAdmin]);

  // 2. Stream Shared Batches from Firestore
  useEffect(() => {
    if (!isAdmin) return;
    try {
      const unsubscribe = onSnapshot(collection(db, 'shared_timetables'), (snapshot) => {
        const fetched: any[] = [];
        snapshot.forEach((d) => {
          fetched.push({ id: d.id, ...d.data() });
        });
        setBatchesList(fetched);
      }, (err) => console.error('Error fetching batches:', err));

      return () => unsubscribe();
    } catch (e) {
      console.error(e);
    }
  }, [isAdmin]);

  // 3. Stream Campaigns from Firestore
  useEffect(() => {
    if (!isAdmin) return;
    try {
      const q = query(collection(db, 'promotional_campaigns'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched: PromotionalCampaign[] = [];
        snapshot.forEach((d) => {
          fetched.push({ id: d.id, ...d.data() } as PromotionalCampaign);
        });
        setCampaignsList(fetched);
      }, () => {
        // Fallback without orderBy index
        onSnapshot(collection(db, 'promotional_campaigns'), (snap) => {
          const fetched: PromotionalCampaign[] = [];
          snap.forEach((d) => {
            fetched.push({ id: d.id, ...d.data() } as PromotionalCampaign);
          });
          setCampaignsList(fetched);
        });
      });

      return () => unsubscribe();
    } catch (e) {
      console.error(e);
    }
  }, [isAdmin]);

  // Dynamic College & Branch Recommendations
  const allAvailableColleges = Array.from(
    new Set([
      'International Institute of Information Technology, Naya Raipur',
      'IIIT-NR',
      'IIT Bombay',
      'IIT Delhi',
      'NIT Raipur',
      'BITS Pilani',
      'VIT Vellore',
      ...usersList.map((u) => u.profile?.college).filter(Boolean),
      ...batchesList.map((b) => b.college).filter(Boolean),
    ])
  );

  const availableBranches = [
    'CSE',
    'DSAI',
    'ECE',
    'IT',
    'EE',
    'Mechanical',
    'Civil',
    'Chemical',
    'Biotech',
    'BBA',
    'MBA',
    'MCA',
  ];

  // Loading state
  if (!isClerkLoaded) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 font-mono text-sm tracking-wider animate-pulse">
          <Shield className="w-5 h-5" />
          <span>AUTHENTICATING SUPER ADMIN...</span>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 border border-black dark:border-white flex items-center justify-center mb-6">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold uppercase tracking-widest mb-2">Super Admin Access</h1>
        <p className="text-xs text-black/60 dark:text-white/60 mb-6 max-w-sm">
          Sign in with your master administrator account to manage users, college batches, and direct campaigns.
        </p>
        <SignInButton mode="modal">
          <button className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-widest border border-black dark:border-white cursor-pointer hover:opacity-90">
            Sign In with Admin Account
          </button>
        </SignInButton>
      </div>
    );
  }

  // Logged in but not Admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 border border-rose-500 text-rose-500 flex items-center justify-center mb-6">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-2">
          Access Restricted
        </h1>
        <p className="text-xs text-black/60 dark:text-white/60 mb-6 max-w-md">
          Your account ({userEmail}) is not authorized to access the Super Admin Control Center.
        </p>
        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-3 border border-black dark:border-white text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Student App</span>
        </Link>
      </div>
    );
  }

  // Handlers for User Role Updates
  const handleUpdateUserRole = async (userId: string, targetRole: AdminRole) => {
    try {
      const targetUser = usersList.find(u => u.id === userId);
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        'profile.role': targetRole,
      });

      // If user is synced to a batch, we MUST update the batch document as well
      // Otherwise, the user will retain/lack CR powers because the batch doc is the source of truth
      if (targetUser?.profile?.isBatchSynced && targetUser?.profile?.batchKey) {
        const batchRef = doc(db, 'shared_timetables', targetUser.profile.batchKey);
        if (targetRole === 'student') {
          await updateDoc(batchRef, {
            crUserIds: arrayRemove(userId),
            crEmails: arrayRemove(targetUser.profile.email || ''),
          }).catch(console.error);
        } else if (targetRole === 'cr' || targetRole === 'super_admin') {
          await updateDoc(batchRef, {
            crUserIds: arrayUnion(userId),
            crEmails: arrayUnion(targetUser.profile.email || ''),
          }).catch(console.error);
        }
      }

      showToast('Role Updated', `User role changed to ${targetRole.toUpperCase()}`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Error', 'Failed to update user role', 'error');
    }
  };

  const handleToggleUserPro = async (userId: string, currentProStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'profile.isPro': !currentProStatus,
      });
      showToast('Pro Status Toggled', `User is now ${!currentProStatus ? 'PRO MEMBER' : 'FREE USER'}`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Error', 'Failed to toggle Pro status', 'error');
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm(`Are you sure you want to delete shared batch: ${batchId}?`)) return;
    try {
      await deleteDoc(doc(db, 'shared_timetables', batchId));
      showToast('Batch Removed', `Batch ${batchId} was deleted`, 'info');
    } catch (e) {
      console.error(e);
      showToast('Error', 'Failed to delete batch', 'error');
    }
  };

  // Handlers for Campaign Management
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.title || !campaignForm.targetUrl) {
      showToast('Missing Fields', 'Title and Target Link are required', 'error');
      return;
    }

    try {
      const campaignId = editingCampaignId || `camp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const docRef = doc(db, 'promotional_campaigns', campaignId);

      const payload: PromotionalCampaign = {
        id: campaignId,
        title: campaignForm.title,
        subtitle: campaignForm.subtitle,
        description: campaignForm.description,
        imageUrl: campaignForm.imageUrl,
        ctaText: campaignForm.ctaText || 'Learn More',
        targetUrl: campaignForm.targetUrl,
        category: campaignForm.category,
        badgeText: campaignForm.badgeText || '',
        targetAudienceType: campaignForm.targetAudienceType,
        targetColleges: campaignForm.targetAudienceType === 'all' ? [] : campaignForm.targetColleges,
        targetBranches: campaignForm.targetAudienceType === 'all' ? [] : campaignForm.targetBranches,
        targetSemesters: campaignForm.targetAudienceType === 'all' ? [] : campaignForm.targetSemesters,
        isActive: campaignForm.isActive,
        impressions: editingCampaignId ? (campaignsList.find(c => c.id === editingCampaignId)?.impressions || 0) : 0,
        clicks: editingCampaignId ? (campaignsList.find(c => c.id === editingCampaignId)?.clicks || 0) : 0,
        createdAt: editingCampaignId ? (campaignsList.find(c => c.id === editingCampaignId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      };

      await setDoc(docRef, payload, { merge: true });
      showToast('Campaign Saved', 'Promotional campaign is live!', 'success');
      setShowCampaignModal(false);
      setEditingCampaignId(null);
      setCampaignForm({
        title: '',
        subtitle: '',
        description: '',
        imageUrl: '',
        ctaText: 'Learn More',
        targetUrl: '',
        category: 'general',
        badgeText: '',
        targetAudienceType: 'all',
        targetColleges: [],
        targetBranches: [],
        targetSemesters: [],
        customCollegeInput: '',
        customBranchInput: '',
        isActive: true,
      });
    } catch (e) {
      console.error(e);
      showToast('Error', 'Failed to save campaign', 'error');
    }
  };

  const handleToggleCampaignActive = async (campaign: PromotionalCampaign) => {
    try {
      const docRef = doc(db, 'promotional_campaigns', campaign.id);
      await updateDoc(docRef, {
        isActive: !campaign.isActive,
      });
      showToast('Campaign Status', `Campaign is now ${!campaign.isActive ? 'ACTIVE' : 'PAUSED'}`, 'info');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await deleteDoc(doc(db, 'promotional_campaigns', campaignId));
      showToast('Campaign Deleted', 'Campaign removed permanently', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  const openEditCampaign = (camp: PromotionalCampaign) => {
    setEditingCampaignId(camp.id);
    setCampaignForm({
      title: camp.title,
      subtitle: camp.subtitle || '',
      description: camp.description || '',
      imageUrl: camp.imageUrl || '',
      ctaText: camp.ctaText || 'Learn More',
      targetUrl: camp.targetUrl,
      category: camp.category || 'general',
      badgeText: camp.badgeText || '',
      targetAudienceType: camp.targetAudienceType || (camp.targetColleges?.length || camp.targetBranches?.length || camp.targetSemesters?.length ? 'custom' : 'all'),
      targetColleges: camp.targetColleges || [],
      targetBranches: camp.targetBranches || [],
      targetSemesters: camp.targetSemesters || [],
      customCollegeInput: '',
      customBranchInput: '',
      isActive: camp.isActive,
    });
    setShowCampaignModal(true);
  };

  // Targeting Helpers
  const toggleCollegeSelection = (col: string) => {
    setCampaignForm((prev) => {
      const exists = prev.targetColleges.includes(col);
      return {
        ...prev,
        targetColleges: exists
          ? prev.targetColleges.filter((c) => c !== col)
          : [...prev.targetColleges, col],
      };
    });
  };

  const addCustomCollege = () => {
    if (!campaignForm.customCollegeInput.trim()) return;
    const val = campaignForm.customCollegeInput.trim();
    if (!campaignForm.targetColleges.includes(val)) {
      setCampaignForm((prev) => ({
        ...prev,
        targetColleges: [...prev.targetColleges, val],
        customCollegeInput: '',
      }));
    } else {
      setCampaignForm((prev) => ({ ...prev, customCollegeInput: '' }));
    }
  };

  const toggleBranchSelection = (branch: string) => {
    setCampaignForm((prev) => {
      const exists = prev.targetBranches.includes(branch);
      return {
        ...prev,
        targetBranches: exists
          ? prev.targetBranches.filter((b) => b !== branch)
          : [...prev.targetBranches, branch],
      };
    });
  };

  const addCustomBranch = () => {
    if (!campaignForm.customBranchInput.trim()) return;
    const val = campaignForm.customBranchInput.trim().toUpperCase();
    if (!campaignForm.targetBranches.includes(val)) {
      setCampaignForm((prev) => ({
        ...prev,
        targetBranches: [...prev.targetBranches, val],
        customBranchInput: '',
      }));
    } else {
      setCampaignForm((prev) => ({ ...prev, customBranchInput: '' }));
    }
  };

  const toggleSemesterSelection = (sem: number) => {
    setCampaignForm((prev) => {
      const exists = prev.targetSemesters.includes(sem);
      return {
        ...prev,
        targetSemesters: exists
          ? prev.targetSemesters.filter((s) => s !== sem)
          : [...prev.targetSemesters, sem],
      };
    });
  };

  // Aggregated Analytics
  const totalImpressions = campaignsList.reduce((acc, c) => acc + (c.impressions || 0), 0);
  const totalClicks = campaignsList.reduce((acc, c) => acc + (c.clicks || 0), 0);
  const overallCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

  // Filtered Lists
  const filteredUsers = usersList.filter((u) => {
    const q = searchUserQuery.toLowerCase();
    const p = u.profile || {};
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.college || '').toLowerCase().includes(q) ||
      (p.rollNumber || '').toLowerCase().includes(q) ||
      (p.branch || '').toLowerCase().includes(q)
    );
  });

  const filteredBatches = batchesList.filter((b) => {
    const q = searchBatchQuery.toLowerCase();
    return (
      (b.college || '').toLowerCase().includes(q) ||
      (b.branch || '').toLowerCase().includes(q) ||
      (b.programme || '').toLowerCase().includes(q) ||
      (b.id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Top Super Admin Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-black dark:border-white px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              title="Return to App"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-black">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black uppercase tracking-widest">
                  Super Admin Panel
                </h1>
                <p className="text-[10px] font-mono text-black/60 dark:text-white/60">
                  Master Control: {userEmail}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: `Users (${usersList.length})`, icon: Users },
              { id: 'batches', label: `Batches (${batchesList.length})`, icon: Layers },
              { id: 'campaigns', label: `Campaigns (${campaignsList.length})`, icon: Megaphone },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as AdminTab)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer shrink-0 ${
                  activeTab === id
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                    : 'border-transparent text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/20 hover:text-black dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6 text-left">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Platform Performance & Metrics</h2>
              <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                Real-time insights across all student registrations, batch networks, and direct ad campaigns.
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border border-black dark:border-white p-5 flex flex-col justify-between bg-black/5 dark:bg-white/5">
                <div className="flex items-center justify-between text-black/60 dark:text-white/60 text-xs font-mono">
                  <span>TOTAL USERS</span>
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black mt-3">{usersList.length}</div>
                <div className="text-[10px] text-black/50 dark:text-white/50 mt-1">Registered Accounts</div>
              </div>

              <div className="border border-black dark:border-white p-5 flex flex-col justify-between bg-black/5 dark:bg-white/5">
                <div className="flex items-center justify-between text-black/60 dark:text-white/60 text-xs font-mono">
                  <span>ACTIVE BATCHES</span>
                  <Layers className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black mt-3">{batchesList.length}</div>
                <div className="text-[10px] text-black/50 dark:text-white/50 mt-1">Shared Class Schedules</div>
              </div>

              <div className="border border-black dark:border-white p-5 flex flex-col justify-between bg-black/5 dark:bg-white/5">
                <div className="flex items-center justify-between text-black/60 dark:text-white/60 text-xs font-mono">
                  <span>AD IMPRESSIONS</span>
                  <Eye className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black mt-3">{totalImpressions}</div>
                <div className="text-[10px] text-black/50 dark:text-white/50 mt-1">Total Views on Promos</div>
              </div>

              <div className="border border-black dark:border-white p-5 flex flex-col justify-between bg-black/5 dark:bg-white/5">
                <div className="flex items-center justify-between text-black/60 dark:text-white/60 text-xs font-mono">
                  <span>CLICKS / CTR</span>
                  <MousePointer className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black mt-3">
                  {totalClicks} <span className="text-sm font-mono text-black/60 dark:text-white/60">({overallCTR}%)</span>
                </div>
                <div className="text-[10px] text-black/50 dark:text-white/50 mt-1">Conversion Engagement</div>
              </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <button
                onClick={() => {
                  setShowCampaignModal(true);
                  setEditingCampaignId(null);
                }}
                className="border-2 border-black dark:border-white p-6 flex flex-col items-start gap-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all text-left cursor-pointer group"
              >
                <Megaphone className="w-6 h-6 mb-1" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Launch Targeted Campaign / Ad</h3>
                <p className="text-xs opacity-70">Target specific colleges, branches, semesters, or everyone.</p>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className="border border-black dark:border-white p-6 flex flex-col items-start gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left cursor-pointer"
              >
                <Award className="w-6 h-6 mb-1" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Assign CR / Manage Roles</h3>
                <p className="text-xs opacity-70">Elevate class representatives or grant Pro status to students.</p>
              </button>

              <button
                onClick={() => setActiveTab('batches')}
                className="border border-black dark:border-white p-6 flex flex-col items-start gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left cursor-pointer"
              >
                <Layers className="w-6 h-6 mb-1" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Audit Batch Timetables</h3>
                <p className="text-xs opacity-70">Review active college schedules and remove spam/duplicate entries.</p>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">Registered Students ({filteredUsers.length})</h2>
                <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                  Manage student profiles, grant CR permissions, and toggle Pro tier subscriptions.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                <input
                  type="text"
                  placeholder="Search name, email, roll no..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-black dark:border-white bg-transparent text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="border border-black dark:border-white overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-black dark:border-white bg-black/5 dark:bg-white/10 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Student</th>
                    <th className="p-3">College & Branch</th>
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Pro Tier</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/10 font-sans">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-black/50 dark:text-white/50">
                        No registered users match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const p = u.profile || {};
                      const currentRole: AdminRole = p.role || 'student';
                      const isPro = !!p.isPro;

                      return (
                        <tr key={u.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="p-3">
                            <div className="font-bold">{p.name || 'Anonymous'}</div>
                            <div className="text-[11px] font-mono text-black/60 dark:text-white/60">{p.email || u.id}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{p.college || 'Not Set'}</div>
                            <div className="text-[11px] opacity-70">
                              {p.programme || ''} {p.branch ? `- ${p.branch}` : ''} {p.semester ? `(Sem ${p.semester})` : ''}
                            </div>
                          </td>
                          <td className="p-3 font-mono">
                            {p.rollNumber || '—'}
                          </td>
                          <td className="p-3">
                            <select
                              value={currentRole}
                              onChange={(e) => handleUpdateUserRole(u.id, e.target.value as AdminRole)}
                              className="px-2 py-1 border border-black dark:border-white bg-white dark:bg-black text-[11px] font-bold uppercase cursor-pointer"
                            >
                              <option value="student">Student</option>
                              <option value="cr">CR (Class Rep)</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleToggleUserPro(u.id, isPro)}
                              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                                isPro
                                  ? 'bg-amber-400 text-black border-amber-500'
                                  : 'border-black/20 dark:border-white/20 text-black/50 dark:text-white/50 hover:border-black'
                              }`}
                            >
                              {isPro ? '★ PRO ACTIVE' : 'FREE USER'}
                            </button>
                          </td>
                          <td className="p-3 text-right font-mono text-[11px]">
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: BATCH MANAGEMENT */}
        {activeTab === 'batches' && (
          <div className="flex flex-col gap-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">Active Batch Timetables ({filteredBatches.length})</h2>
                <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                  All shared college batch schedules currently published by class representatives.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                <input
                  type="text"
                  placeholder="Search college, branch..."
                  value={searchBatchQuery}
                  onChange={(e) => setSearchBatchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-black dark:border-white bg-transparent text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="border border-black dark:border-white overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-black dark:border-white bg-black/5 dark:bg-white/10 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Batch Key / ID</th>
                    <th className="p-3">College & Programme</th>
                    <th className="p-3">Branch & Semester</th>
                    <th className="p-3">Creator</th>
                    <th className="p-3">Subjects / Events</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/10 font-sans">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-black/50 dark:text-white/50">
                        No shared batches found.
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono font-bold">{b.id}</td>
                        <td className="p-3">
                          <div className="font-bold">{b.college}</div>
                          <div className="text-[11px] opacity-70">{b.programme}</div>
                        </td>
                        <td className="p-3">
                          <div>{b.branch}</div>
                          <div className="text-[11px] opacity-70">Semester {b.semester}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{b.creatorName || 'Anonymous'}</div>
                          <div className="text-[10px] font-mono text-black/60 dark:text-white/60">{b.creatorId}</div>
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          <div>{b.subjects?.length || 0} Subjects</div>
                          <div className="text-black/60 dark:text-white/60">{b.events?.length || 0} Calendar Events</div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteBatch(b.id)}
                            className="p-1.5 border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                            title="Delete Batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CAMPAIGN & AD MANAGER */}
        {activeTab === 'campaigns' && (
          <div className="flex flex-col gap-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">Direct Campaigns & Targeted Ads ({campaignsList.length})</h2>
                <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                  Promote movies, merchandise drops, campus events, and student deals to specific colleges, branches, or everyone.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCampaignId(null);
                  setCampaignForm({
                    title: '',
                    subtitle: '',
                    description: '',
                    imageUrl: '',
                    ctaText: 'Learn More',
                    targetUrl: '',
                    category: 'general',
                    badgeText: '',
                    targetAudienceType: 'all',
                    targetColleges: [],
                    targetBranches: [],
                    targetSemesters: [],
                    customCollegeInput: '',
                    customBranchInput: '',
                    isActive: true,
                  });
                  setShowCampaignModal(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider border border-black dark:border-white hover:opacity-90 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Campaign</span>
              </button>
            </div>

            {/* Campaign Cards / Table */}
            {campaignsList.length === 0 ? (
              <div className="border-2 border-dashed border-black/20 dark:border-white/20 p-12 text-center flex flex-col items-center justify-center gap-3">
                <Megaphone className="w-10 h-10 text-black/40 dark:text-white/40" />
                <h3 className="text-base font-bold uppercase tracking-wider">No Active Campaigns Yet</h3>
                <p className="text-xs text-black/60 dark:text-white/60 max-w-sm">
                  Launch your first targeted sponsor banner, movie promo, or college T-shirt sale.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaignsList.map((camp) => {
                  const ctr = camp.impressions > 0 ? ((camp.clicks / camp.impressions) * 100).toFixed(1) : '0.0';
                  const isUniversal = camp.targetAudienceType === 'all' || (!camp.targetColleges?.length && !camp.targetBranches?.length && !camp.targetSemesters?.length);

                  return (
                    <div
                      key={camp.id}
                      className={`border p-5 flex flex-col justify-between transition-all ${
                        camp.isActive
                          ? 'border-black dark:border-white bg-white dark:bg-zinc-950 shadow-sm'
                          : 'border-black/30 dark:border-white/30 opacity-60 bg-black/5 dark:bg-white/5'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/10 dark:border-white/10">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 border border-black dark:border-white text-[10px] font-bold uppercase tracking-wider">
                            {camp.category === 'movie' && <Film className="w-3 h-3" />}
                            {camp.category === 'merch' && <ShoppingBag className="w-3 h-3" />}
                            {camp.category === 'event' && <Calendar className="w-3 h-3" />}
                            {camp.category === 'deal' && <Tag className="w-3 h-3" />}
                            <span>{camp.category.toUpperCase()}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border ${
                                camp.isActive
                                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                  : 'border-rose-500 text-rose-500 bg-rose-500/10'
                              }`}
                            >
                              {camp.isActive ? '● LIVE' : 'PAUSED'}
                            </span>
                          </div>
                        </div>

                        {/* Banner Image Preview */}
                        {camp.imageUrl && (
                          <div className="h-32 w-full overflow-hidden border border-black/20 dark:border-white/20 mb-3 bg-black/5 dark:bg-white/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={camp.imageUrl}
                              alt={camp.title}
                              className="w-full h-full object-cover object-center"
                            />
                          </div>
                        )}

                        <h3 className="text-base font-bold tracking-tight">{camp.title}</h3>
                        <p className="text-xs text-black/70 dark:text-white/70 mt-1 line-clamp-2">
                          {camp.subtitle || camp.description}
                        </p>

                        {/* Target Scope Badge */}
                        <div className="mt-3.5 p-2.5 border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex flex-col gap-1 text-[11px] font-mono">
                          <div className="flex items-center gap-1.5 font-bold">
                            {isUniversal ? (
                              <>
                                <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>AUDIENCE: Everyone (All Colleges & Branches)</span>
                              </>
                            ) : (
                              <>
                                <Crosshair className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>AUDIENCE: Targeted Selection</span>
                              </>
                            )}
                          </div>
                          {!isUniversal && (
                            <div className="text-[10px] text-black/70 dark:text-white/70 flex flex-col gap-0.5 pt-0.5">
                              <div>Colleges: {camp.targetColleges?.length ? camp.targetColleges.join(', ') : 'All Colleges'}</div>
                              <div>Branches: {camp.targetBranches?.length ? camp.targetBranches.join(', ') : 'All Branches'}</div>
                              {camp.targetSemesters?.length ? (
                                <div>Semesters: {camp.targetSemesters.map(s => `Sem ${s}`).join(', ')}</div>
                              ) : null}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 text-[10px] font-mono text-black/60 dark:text-white/60 truncate">
                          Link: <a href={camp.targetUrl} target="_blank" rel="noreferrer" className="underline hover:text-black dark:hover:text-white">{camp.targetUrl}</a>
                        </div>
                      </div>

                      {/* Analytics Bar & Controls */}
                      <div className="pt-4 mt-4 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="flex items-center gap-1" title="Impressions">
                            <Eye className="w-3.5 h-3.5 opacity-60" />
                            <span>{camp.impressions || 0}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Clicks">
                            <MousePointer className="w-3.5 h-3.5 opacity-60" />
                            <span>{camp.clicks || 0}</span>
                          </div>
                          <div className="font-bold">
                            CTR: {ctr}%
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            onClick={() => handleToggleCampaignActive(camp)}
                            className="px-3 py-1.5 border border-black dark:border-white text-xs font-bold uppercase hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                          >
                            {camp.isActive ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            onClick={() => openEditCampaign(camp)}
                            className="p-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(camp.id)}
                            className="p-1.5 border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      <AnimatePresence>
        {showCampaignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCampaignModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl bg-white dark:bg-zinc-950 border border-black dark:border-white shadow-2xl p-6 sm:p-7 z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold uppercase tracking-wider mb-1">
                {editingCampaignId ? 'Edit Campaign' : 'Create Targeted Campaign / Ad'}
              </h3>
              <p className="text-xs text-black/60 dark:text-white/60 mb-5">
                Configure your native promo banner details, destination link, and target audience.
              </p>

              <form onSubmit={handleSaveCampaign} className="flex flex-col gap-4 text-xs font-sans">
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1">Campaign Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Official Batch '26 Hoodie Drop"
                    value={campaignForm.title}
                    onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                    className="w-full p-2.5 border border-black dark:border-white bg-transparent focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1">Subtitle / Tagline</label>
                  <input
                    type="text"
                    placeholder="e.g. Limited pre-orders open now. Custom college embroidery."
                    value={campaignForm.subtitle}
                    onChange={(e) => setCampaignForm({ ...campaignForm, subtitle: e.target.value })}
                    className="w-full p-2.5 border border-black dark:border-white bg-transparent focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider mb-1">Category</label>
                    <select
                      value={campaignForm.category}
                      onChange={(e) => setCampaignForm({ ...campaignForm, category: e.target.value as CampaignCategory })}
                      className="w-full p-2.5 border border-black dark:border-white bg-white dark:bg-black focus:outline-none font-medium cursor-pointer"
                    >
                      <option value="merch">Merchandise / T-Shirts</option>
                      <option value="movie">Movie Promotion</option>
                      <option value="event">Campus Event / Fest</option>
                      <option value="deal">Student Perk / Deal</option>
                      <option value="general">General Spotlight</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider mb-1">Button CTA Text</label>
                    <input
                      type="text"
                      placeholder="e.g. Pre-Order Now"
                      value={campaignForm.ctaText}
                      onChange={(e) => setCampaignForm({ ...campaignForm, ctaText: e.target.value })}
                      className="w-full p-2.5 border border-black dark:border-white bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1">Destination Target Link *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={campaignForm.targetUrl}
                    onChange={(e) => setCampaignForm({ ...campaignForm, targetUrl: e.target.value })}
                    className="w-full p-2.5 border border-black dark:border-white bg-transparent focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1">Banner Image / Poster URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or poster image link"
                    value={campaignForm.imageUrl}
                    onChange={(e) => setCampaignForm({ ...campaignForm, imageUrl: e.target.value })}
                    className="w-full p-2.5 border border-black dark:border-white bg-transparent focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1">Custom Badge Text (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. LIMITED MERCH DROP or MOVIE NIGHT"
                    value={campaignForm.badgeText}
                    onChange={(e) => setCampaignForm({ ...campaignForm, badgeText: e.target.value })}
                    className="w-full p-2.5 border border-black dark:border-white bg-transparent focus:outline-none"
                  />
                </div>

                {/* ADVANCED TARGETING SECTION */}
                <div className="border border-black dark:border-white p-4 bg-black/5 dark:bg-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
                      <Crosshair className="w-4 h-4 text-amber-500" />
                      <span>Audience Targeting & Scope</span>
                    </div>
                  </div>

                  {/* Radio Switcher */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCampaignForm({ ...campaignForm, targetAudienceType: 'all' })}
                      className={`flex items-center justify-center gap-2 p-2.5 border text-xs font-bold uppercase cursor-pointer transition-all ${
                        campaignForm.targetAudienceType === 'all'
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                          : 'border-black/20 dark:border-white/20 hover:border-black'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Everyone (All Colleges)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCampaignForm({ ...campaignForm, targetAudienceType: 'custom' })}
                      className={`flex items-center justify-center gap-2 p-2.5 border text-xs font-bold uppercase cursor-pointer transition-all ${
                        campaignForm.targetAudienceType === 'custom'
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                          : 'border-black/20 dark:border-white/20 hover:border-black'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Specific Colleges / Branches</span>
                    </button>
                  </div>

                  {/* Custom Targeting Fields */}
                  {campaignForm.targetAudienceType === 'custom' && (
                    <div className="flex flex-col gap-4 pt-2">
                      {/* 1. Target Colleges */}
                      <div>
                        <label className="block font-bold uppercase tracking-wider mb-1.5 text-[10px]">
                          Target Colleges (Select or Add Multiple)
                        </label>
                        
                        {/* College Chips */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {allAvailableColleges.map((col) => {
                            const isSelected = campaignForm.targetColleges.includes(col);
                            return (
                              <button
                                key={col}
                                type="button"
                                onClick={() => toggleCollegeSelection(col)}
                                className={`px-2.5 py-1 text-[11px] font-medium border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                                    : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'
                                }`}
                              >
                                {isSelected ? '✓ ' : '+ '}
                                {col}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom College Input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type any other college name..."
                            value={campaignForm.customCollegeInput}
                            onChange={(e) => setCampaignForm({ ...campaignForm, customCollegeInput: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomCollege();
                              }
                            }}
                            className="flex-1 p-2 border border-black dark:border-white bg-transparent focus:outline-none text-xs"
                          />
                          <button
                            type="button"
                            onClick={addCustomCollege}
                            className="px-3 py-2 border border-black dark:border-white font-bold uppercase text-[10px] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                        <p className="text-[10px] text-black/50 dark:text-white/50 mt-1">
                          {campaignForm.targetColleges.length === 0
                            ? 'No specific colleges selected — will show across all colleges.'
                            : `Selected Colleges (${campaignForm.targetColleges.length}): ${campaignForm.targetColleges.join(', ')}`}
                        </p>
                      </div>

                      {/* 2. Target Branches */}
                      <div>
                        <label className="block font-bold uppercase tracking-wider mb-1.5 text-[10px]">
                          Target Branches (Leave empty for All Branches)
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {availableBranches.map((branch) => {
                            const isSelected = campaignForm.targetBranches.includes(branch);
                            return (
                              <button
                                key={branch}
                                type="button"
                                onClick={() => toggleBranchSelection(branch)}
                                className={`px-2 py-0.5 text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                                    : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'
                                }`}
                              >
                                {isSelected ? '✓ ' : ''}{branch}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Branch Input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type custom branch code (e.g. AI-ML, Robotics)..."
                            value={campaignForm.customBranchInput}
                            onChange={(e) => setCampaignForm({ ...campaignForm, customBranchInput: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomBranch();
                              }
                            }}
                            className="flex-1 p-2 border border-black dark:border-white bg-transparent focus:outline-none text-xs"
                          />
                          <button
                            type="button"
                            onClick={addCustomBranch}
                            className="px-3 py-2 border border-black dark:border-white font-bold uppercase text-[10px] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* 3. Target Semesters */}
                      <div>
                        <label className="block font-bold uppercase tracking-wider mb-1.5 text-[10px]">
                          Target Semesters (Leave empty for All Semesters)
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
                            const isSelected = campaignForm.targetSemesters.includes(sem);
                            return (
                              <button
                                key={sem}
                                type="button"
                                onClick={() => toggleSemesterSelection(sem)}
                                className={`px-3 py-1 text-[11px] font-mono border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                                    : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'
                                }`}
                              >
                                {isSelected ? `✓ Sem ${sem}` : `Sem ${sem}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_active_checkbox"
                    checked={campaignForm.isActive}
                    onChange={(e) => setCampaignForm({ ...campaignForm, isActive: e.target.checked })}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="is_active_checkbox" className="font-bold cursor-pointer">
                    Set Campaign Active immediately upon saving
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowCampaignModal(false)}
                    className="px-4 py-2.5 border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white transition-colors cursor-pointer uppercase font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider border border-black dark:border-white hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Save & Publish Campaign
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
