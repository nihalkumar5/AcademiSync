'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isUserSuperAdmin } from '@/lib/adminAuth';
import { collection, onSnapshot, doc, getDoc, updateDoc, setDoc, deleteDoc, query, orderBy, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PromotionalCampaign, CampaignCategory, AdminRole } from '@/lib/types';
import { searchCollegesAsync, CollegeItem, POPULAR_INDIAN_COLLEGES } from '@/lib/collegeDirectory';
import {
  Shield,
  Users,
  Layers,
  Megaphone,
  Plus,
  Trash2,
  ChevronDown,
  Edit2,
  ExternalLink,
  Eye,
  MousePointer,
  CheckCircle2,
  XCircle,
  Search,
  Lock,
  ArrowLeft,
  ArrowRight,
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
  X,
  Upload,
  Phone,
  Mail,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';

type AdminTab = 'overview' | 'users' | 'batches' | 'campaigns' | 'cr_requests';

export default function SuperAdminPage() {
  const router = useRouter();
  const { profile, showToast, user, isClerkLoaded } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [batchesList, setBatchesList] = useState<any[]>([]);
  const [campaignsList, setCampaignsList] = useState<PromotionalCampaign[]>([]);
  const [crRequestsList, setCrRequestsList] = useState<any[]>([]);
  const [crStatusFilter, setCrStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchBatchQuery, setSearchBatchQuery] = useState('');

  // Modal for Campaign creation/editing
  const [activeRoleDropdown, setActiveRoleDropdown] = useState<string | null>(null);
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
    branchTargeting: 'all' as 'all' | 'custom',
    targetBranches: [] as string[],
    semesterTargeting: 'all' as 'all' | 'custom',
    targetSemesters: [] as number[],
    customCollegeInput: '',
    customBranchInput: '',
    isActive: true,
  });
  
  const [collegeSearchQuery, setCollegeSearchQuery] = useState('');
  
  // SheerID College Search for Campaign Audience Targeting
  const [campaignCollegeQuery, setCampaignCollegeQuery] = useState('');
  const [suggestedCampaignColleges, setSuggestedCampaignColleges] = useState<CollegeItem[]>([]);
  const [isSearchingColleges, setIsSearchingColleges] = useState(false);
  const [showCampaignCollegeDropdown, setShowCampaignCollegeDropdown] = useState(false);

  useEffect(() => {
    let active = true;
    if (!campaignCollegeQuery.trim()) {
      setSuggestedCampaignColleges([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingColleges(true);
      try {
        const results = await searchCollegesAsync(campaignCollegeQuery);
        if (active) {
          setSuggestedCampaignColleges(results);
        }
      } catch (err) {
        console.error('Error searching colleges for campaign:', err);
      } finally {
        if (active) setIsSearchingColleges(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [campaignCollegeQuery]);

  // Handle Android Hardware Back Button in Admin Page
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let backHandle: any;
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', () => {
        if (showCampaignModal || activeRoleDropdown) {
          setShowCampaignModal(false);
          setActiveRoleDropdown(null);
          return;
        }
        if (activeTab !== 'overview') {
          setActiveTab('overview');
          return;
        }
        router.push('/');
      }).then((handle) => {
        backHandle = handle;
      });
    });
    return () => {
      backHandle?.remove();
    };
  }, [showCampaignModal, activeRoleDropdown, activeTab, router]);

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

  // 4. Stream CR Verification Requests from Firestore
  useEffect(() => {
    if (!isAdmin) return;
    try {
      const unsubscribe = onSnapshot(collection(db, 'cr_requests'), (snapshot) => {
        const fetched: any[] = [];
        snapshot.forEach((d) => {
          fetched.push({ id: d.id, ...d.data() });
        });
        fetched.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setCrRequestsList(fetched);
      }, (err) => console.error('Error fetching CR requests:', err));

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
        <Link href="/sign-in">
          <button className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-widest border border-black dark:border-white cursor-pointer hover:opacity-90">
            Sign In with Admin Account
          </button>
        </Link>
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

  const handleApproveCRRequest = async (req: any) => {
    try {
      // 1. Update cr_requests status
      await updateDoc(doc(db, 'cr_requests', req.id), {
        status: 'approved',
        approvedAt: new Date().toISOString()
      });

      // 2. Update user profile to CR role & bind batch
      const userRef = doc(db, 'users', req.userId);
      await updateDoc(userRef, {
        'profile.role': 'cr',
        'profile.isBatchSynced': true,
        'profile.batchKey': req.batchKey,
        'profile.college': req.college,
        'profile.branch': req.branch,
        'profile.semester': req.semester,
        'profile.section': req.section || 'A'
      }).catch(console.error);

      // 3. Update or create shared_timetables doc
      const batchRef = doc(db, 'shared_timetables', req.batchKey);
      const batchSnap = await getDoc(batchRef);
      if (batchSnap.exists()) {
        await updateDoc(batchRef, {
          crUserIds: arrayUnion(req.userId),
          crEmails: arrayUnion(req.email || '')
        });
      } else {
        await setDoc(batchRef, {
          id: req.batchKey,
          college: req.college,
          programme: req.programme || 'B.Tech',
          branch: req.branch,
          semester: req.semester,
          section: req.section || 'A',
          creatorId: req.userId,
          creatorName: req.name,
          creatorEmail: req.email,
          crUserIds: [req.userId],
          crEmails: [req.email],
          inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          subjects: [],
          timetable: [],
          studentCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      showToast('CR Approved! 👑', `${req.name} is now verified CR for ${req.branch} (Sec ${req.section || 'A'}).`, 'success');
    } catch (e) {
      console.error('Error approving CR request:', e);
      showToast('Approval Failed', 'Could not approve CR request.', 'error');
    }
  };

  const handleRejectCRRequest = async (req: any) => {
    try {
      await updateDoc(doc(db, 'cr_requests', req.id), {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });
      showToast('Request Rejected', `CR application for ${req.name} rejected.`, 'info');
    } catch (e) {
      console.error('Error rejecting CR request:', e);
      showToast('Error', 'Failed to reject CR request.', 'error');
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
        targetBranches: campaignForm.targetAudienceType === 'all' || campaignForm.branchTargeting === 'all' ? [] : campaignForm.targetBranches,
        targetSemesters: campaignForm.targetAudienceType === 'all' || campaignForm.semesterTargeting === 'all' ? [] : campaignForm.targetSemesters,
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
        branchTargeting: 'all',
        semesterTargeting: 'all',
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
      branchTargeting: camp.targetBranches?.length ? 'custom' : 'all',
      targetBranches: camp.targetBranches || [],
      semesterTargeting: camp.targetSemesters?.length ? 'custom' : 'all',
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
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] font-sans selection:bg-[#111111] selection:text-[#FFFFFF] dark:selection:bg-[#FFFFFF] dark:selection:text-[#111111]">
      {/* Top Super Admin Header */}
      <header className="sticky top-0 z-40 bg-[#F7F7F5] dark:bg-[#111111]">
        <div className="px-4 sm:px-8 pt-8 pb-6 border-b border-[#D8D8D8] dark:border-[#333333]">
          <div className="max-w-7xl w-full mx-auto flex flex-col gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[12px] font-bold text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] uppercase tracking-wider transition-colors w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              <Crown className="w-3.5 h-3.5 ml-1" />
              <span>SUPER ADMIN</span>
            </Link>
            <h1 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-none text-[#111111] dark:text-[#FFFFFF]">
              Control Center
            </h1>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-[#D8D8D8] dark:border-[#333333]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="flex items-center gap-8 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {(() => {
                const pendingCRCount = crRequestsList.filter(r => r.status === 'pending').length;
                return [
                  { id: 'overview', label: 'Overview' },
                  { id: 'cr_requests', label: `👑 CR Requests ${pendingCRCount > 0 ? `(${pendingCRCount})` : ''}` },
                  { id: 'users', label: `Users ${usersList.length}` },
                  { id: 'batches', label: `Batches ${batchesList.length}` },
                  { id: 'campaigns', label: `Campaigns ${campaignsList.length}` },
                ];
              })().map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as AdminTab)}
                  className={`relative py-4 text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === id
                      ? 'text-[#111111] dark:text-[#FFFFFF]'
                      : 'text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF]'
                  }`}
                >
                  {label}
                  {activeTab === id && (
                    <motion.div layoutId="tab-indicator" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#111111] dark:bg-[#FFFFFF]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6 text-left">
            <div>
              <h2 className="text-[14px] font-bold uppercase tracking-[1.5px] text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#F0F0F0] dark:border-[#333333]">Overview</h2>
              <p className="text-[12px] text-[#6F6F6F] mt-3 font-medium">
                Live snapshot of your student network.
              </p>
            </div>

            {/* Primary Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col py-2">
                <div className="text-[32px] font-black leading-none text-[#111111] dark:text-[#FFFFFF]">{usersList.length}</div>
                <div className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-widest mt-2">Total Users</div>
              </div>

              <div className="flex flex-col py-2">
                <div className="text-[32px] font-black leading-none text-[#111111] dark:text-[#FFFFFF]">{batchesList.length}</div>
                <div className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-widest mt-2">Active Batches</div>
              </div>
            </div>
            
            {/* Campaign Performance */}
            <div className="mt-4 border-t border-[#D8D8D8] dark:border-[#333333] pt-6">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#A0A0A0] mb-4">Campaign Performance</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <div className="text-[20px] font-bold leading-none text-[#111111] dark:text-[#FFFFFF]">{totalImpressions}</div>
                  <div className="text-[10px] text-[#6F6F6F] mt-1 font-medium uppercase tracking-wider">Impressions</div>
                </div>
                <div className="flex flex-col">
                  <div className="text-[20px] font-bold leading-none text-[#111111] dark:text-[#FFFFFF]">{totalClicks}</div>
                  <div className="text-[10px] text-[#6F6F6F] mt-1 font-medium uppercase tracking-wider">Clicks</div>
                </div>
                <div className="flex flex-col">
                  <div className="text-[20px] font-bold leading-none text-[#111111] dark:text-[#FFFFFF]">{overallCTR}%</div>
                  <div className="text-[10px] text-[#6F6F6F] mt-1 font-medium uppercase tracking-wider">CTR</div>
                </div>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="mt-8">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#A0A0A0] mb-2 border-b border-[#F0F0F0] dark:border-[#333333] pb-2">Admin Actions</h3>
              
              <div className="flex flex-col gap-0">
                <button
                  onClick={() => {
                    setShowCampaignModal(true);
                    setEditingCampaignId(null);
                  }}
                  className="flex items-center justify-between py-4 border-b border-[#F0F0F0] dark:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer text-left group"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider">Launch Campaign</span>
                    <span className="text-[12px] text-[#6F6F6F] font-medium">Target colleges, branches, semesters or individual batches.</span>
                  </div>
                  <ArrowRight className="w-[14px] h-[14px] text-[#111111] dark:text-[#FFFFFF] opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className="flex items-center justify-between py-4 border-b border-[#F0F0F0] dark:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer text-left group"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider">Manage Users & Roles</span>
                    <span className="text-[12px] text-[#6F6F6F] font-medium">Assign CRs, manage access and student permissions.</span>
                  </div>
                  <ArrowRight className="w-[14px] h-[14px] text-[#111111] dark:text-[#FFFFFF] opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => setActiveTab('batches')}
                  className="flex items-center justify-between py-4 border-b border-[#F0F0F0] dark:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer text-left group"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider">Manage Batches</span>
                    <span className="text-[12px] text-[#6F6F6F] font-medium">Review active schedules and remove spam entries.</span>
                  </div>
                  <ArrowRight className="w-[14px] h-[14px] text-[#111111] dark:text-[#FFFFFF] opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
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

            {/* Mobile Users List (Cards) */}
            <div className="flex flex-col gap-4 sm:hidden">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-[#6F6F6F] border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A]">
                  No registered users match your search.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const p = u.profile || {};
                  const currentRole = p.role || 'student';
                  const isPro = !!p.isPro;

                  return (
                    <div key={u.id} className="border border-[#D8D8D8] dark:border-[#333333] p-4 flex flex-col gap-4 bg-white dark:bg-[#111111]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-[14px] text-[#111111] dark:text-[#FFFFFF]">{p.name || 'Anonymous'}</span>
                          <span className="text-[11px] font-mono text-[#6F6F6F]">{p.email || u.id}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[#A0A0A0] font-mono block">Joined {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-[#A0A0A0]">Academic</span>
                        <span className="text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF] leading-tight line-clamp-2">{p.college || 'Not Set'}</span>
                        <span className="text-[11px] text-[#6F6F6F]">
                          {p.programme || ''} {p.branch ? `- ${p.branch}` : ''} {p.semester ? `(Sem ${p.semester})` : ''} • {p.rollNumber || '—'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 pt-3 border-t border-[#F0F0F0] dark:border-[#222222]">
                        <div className="relative flex-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRoleDropdown(activeRoleDropdown === u.id ? null : u.id);
                            }}
                            className="w-full h-full flex items-center justify-between px-3 py-2 border border-[#D8D8D8] dark:border-[#333333] bg-transparent text-[11px] font-bold uppercase cursor-pointer rounded-none focus:outline-none"
                          >
                            <span>{currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'cr' ? 'CR (Class Rep)' : 'Student'}</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                          </button>
                          
                          {activeRoleDropdown === u.id && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] z-50 shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex flex-col rounded-none">
                              {['student', 'cr', 'super_admin'].map(role => (
                                <button
                                  key={role}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateUserRole(u.id, role as any);
                                    setActiveRoleDropdown(null);
                                  }}
                                  className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[1px] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
                                >
                                  {role === 'super_admin' ? 'Super Admin' : role === 'cr' ? 'CR (Class Rep)' : 'Student'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleToggleUserPro(u.id, isPro)}
                          className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider border cursor-pointer rounded-none transition-colors ${
                            isPro
                              ? 'bg-[#111111] text-[#FFFFFF] border-[#111111] dark:bg-[#FFFFFF] dark:text-[#111111] dark:border-[#FFFFFF]'
                              : 'border-[#D8D8D8] dark:border-[#333333] text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF]'
                          }`}
                        >
                          {isPro ? '★ PRO ACTIVE' : 'FREE USER'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Users Table */}
            <div className="hidden sm:block border border-[#D8D8D8] dark:border-[#333333] overflow-x-auto bg-white dark:bg-[#111111]">
              <table className="w-full text-[12px] text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A] font-bold uppercase tracking-[1px] text-[10px] text-[#A0A0A0]">
                    <th className="p-4 font-bold">Student</th>
                    <th className="p-4 font-bold">College & Branch</th>
                    <th className="p-4 font-bold">Roll No</th>
                    <th className="p-4 font-bold">Role</th>
                    <th className="p-4 font-bold">Pro Tier</th>
                    <th className="p-4 font-bold text-right">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0] dark:divide-[#222222] font-sans">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#6F6F6F]">
                        No registered users match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const p = u.profile || {};
                      const currentRole = p.role || 'student';
                      const isPro = !!p.isPro;

                      return (
                        <tr key={u.id} className="hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-[13px] text-[#111111] dark:text-[#FFFFFF]">{p.name || 'Anonymous'}</div>
                            <div className="text-[11px] font-mono text-[#6F6F6F]">{p.email || u.id}</div>
                          </td>
                          <td className="p-4 max-w-[250px]">
                            <div className="font-medium text-[#111111] dark:text-[#FFFFFF] truncate" title={p.college || 'Not Set'}>{p.college || 'Not Set'}</div>
                            <div className="text-[11px] text-[#6F6F6F]">
                              {p.programme || ''} {p.branch ? `- ${p.branch}` : ''} {p.semester ? `(Sem ${p.semester})` : ''}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-[#111111] dark:text-[#FFFFFF]">
                            {p.rollNumber || '—'}
                          </td>
                          <td className="p-4">
                            <div className="relative min-w-[140px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRoleDropdown(activeRoleDropdown === u.id ? null : u.id);
                            }}
                            className="w-full h-full flex items-center justify-between px-3 py-2 border border-[#D8D8D8] dark:border-[#333333] bg-transparent text-[11px] font-bold uppercase cursor-pointer rounded-none focus:outline-none"
                          >
                            <span>{currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'cr' ? 'CR (Class Rep)' : 'Student'}</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                          </button>
                          
                          {activeRoleDropdown === u.id && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] z-50 shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex flex-col rounded-none">
                              {['student', 'cr', 'super_admin'].map(role => (
                                <button
                                  key={role}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateUserRole(u.id, role as any);
                                    setActiveRoleDropdown(null);
                                  }}
                                  className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[1px] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
                                >
                                  {role === 'super_admin' ? 'Super Admin' : role === 'cr' ? 'CR (Class Rep)' : 'Student'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleToggleUserPro(u.id, isPro)}
                              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border cursor-pointer rounded-none transition-colors ${
                                isPro
                                  ? 'bg-[#111111] text-[#FFFFFF] border-[#111111] dark:bg-[#FFFFFF] dark:text-[#111111] dark:border-[#FFFFFF]'
                                  : 'border-[#D8D8D8] dark:border-[#333333] text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF]'
                              }`}
                            >
                              {isPro ? '★ PRO ACTIVE' : 'FREE USER'}
                            </button>
                          </td>
                          <td className="p-4 text-right font-mono text-[11px] text-[#6F6F6F]">
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

            {/* Mobile Batches List (Cards) */}
            <div className="flex flex-col gap-4 sm:hidden">
              {filteredBatches.length === 0 ? (
                <div className="p-8 text-center text-[#6F6F6F] border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A]">
                  No shared batches found.
                </div>
              ) : (
                filteredBatches.map((b) => (
                  <div key={b.id} className="border border-[#D8D8D8] dark:border-[#333333] p-4 flex flex-col gap-4 bg-white dark:bg-[#111111]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col flex-1">
                        <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-[#A0A0A0]">Batch ID</span>
                        <span className="font-mono text-[11px] text-[#111111] dark:text-[#FFFFFF] break-all">{b.id}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteBatch(b.id)}
                        className="p-2 border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer rounded-none shrink-0"
                        title="Delete Batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 pt-3 border-t border-[#F0F0F0] dark:border-[#222222]">
                      <span className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-tight line-clamp-2" title={b.college}>{b.college}</span>
                      <span className="text-[11px] text-[#6F6F6F]">
                        {b.programme} • {b.branch} (Sem {b.semester})
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 pt-3 border-t border-[#F0F0F0] dark:border-[#222222]">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#A0A0A0] uppercase font-bold tracking-[1px]">Creator</span>
                        <span className="text-[11px] font-medium text-[#111111] dark:text-[#FFFFFF]">{b.creatorName || 'Anonymous'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#A0A0A0] uppercase font-bold tracking-[1px]">Data</span>
                        <span className="text-[11px] font-mono text-[#6F6F6F]">
                          {b.subjects?.length || 0} Sub • {b.events?.length || 0} Evt
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Batches Table */}
            <div className="hidden sm:block border border-[#D8D8D8] dark:border-[#333333] overflow-x-auto bg-white dark:bg-[#111111]">
              <table className="w-full text-[12px] text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A] font-bold uppercase tracking-[1px] text-[10px] text-[#A0A0A0]">
                    <th className="p-4 font-bold">Batch Key / ID</th>
                    <th className="p-4 font-bold">College & Programme</th>
                    <th className="p-4 font-bold">Branch & Semester</th>
                    <th className="p-4 font-bold">Creator</th>
                    <th className="p-4 font-bold">Data</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0] dark:divide-[#222222] font-sans">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#6F6F6F]">
                        No shared batches found.
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors">
                        <td className="p-4 font-mono font-bold text-[11px] max-w-[200px] truncate" title={b.id}>{b.id}</td>
                        <td className="p-4 max-w-[250px]">
                          <div className="font-medium text-[#111111] dark:text-[#FFFFFF] truncate" title={b.college}>{b.college}</div>
                          <div className="text-[11px] text-[#6F6F6F]">{b.programme}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-[#111111] dark:text-[#FFFFFF] font-medium">{b.branch}</div>
                          <div className="text-[11px] text-[#6F6F6F]">Semester {b.semester}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-[#111111] dark:text-[#FFFFFF]">{b.creatorName || 'Anonymous'}</div>
                          <div className="text-[10px] font-mono text-[#6F6F6F] truncate max-w-[120px]" title={b.creatorId}>{b.creatorId}</div>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-[#6F6F6F]">
                          <div>{b.subjects?.length || 0} Sub</div>
                          <div>{b.events?.length || 0} Evt</div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteBatch(b.id)}
                            className="p-1.5 border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer rounded-none inline-flex items-center justify-center"
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
        branchTargeting: 'all',
        semesterTargeting: 'all',
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

        {/* TAB 5: CR VERIFICATION REQUESTS */}
        {activeTab === 'cr_requests' && (
          <div className="flex flex-col gap-6 text-left">
            {/* Tab Header & Filter Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D8D8D8] dark:border-[#333333]">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#111111] dark:text-[#FFFFFF] flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  Batch Pilot Requests 🚀
                </h2>
                <p className="text-xs text-[#6F6F6F] mt-1">
                  Approve verified student leaders to create, publish & broadcast official schedules for their college section (up to 3 Pilots per batch).
                </p>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {(['pending', 'all', 'approved', 'rejected'] as const).map((filter) => {
                  const count = filter === 'all' 
                    ? crRequestsList.length 
                    : crRequestsList.filter(r => r.status === filter).length;
                  return (
                    <button
                      key={filter}
                      onClick={() => setCrStatusFilter(filter)}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        crStatusFilter === filter
                          ? 'bg-[#111111] text-white dark:bg-white dark:text-black shadow-sm'
                          : 'bg-white dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] text-[#6F6F6F] hover:text-[#111111] dark:hover:text-white'
                      }`}
                    >
                      {filter} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Requests Grid / List */}
            {(() => {
              const filteredRequests = crRequestsList.filter((r) => {
                if (crStatusFilter === 'all') return true;
                return r.status === crStatusFilter;
              });

              if (filteredRequests.length === 0) {
                return (
                  <div className="p-12 text-center border border-dashed border-[#D8D8D8] dark:border-[#333333] rounded-2xl flex flex-col items-center justify-center gap-2">
                    <Crown className="w-8 h-8 text-slate-300 dark:text-zinc-700" />
                    <span className="text-sm font-medium text-[#6F6F6F]">
                      No {crStatusFilter === 'all' ? '' : crStatusFilter} CR requests found.
                    </span>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRequests.map((req) => {
                    const isPending = req.status === 'pending';
                    const isApproved = req.status === 'approved';
                    const isRejected = req.status === 'rejected';

                    return (
                      <div
                        key={req.id}
                        className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                          isPending
                            ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-300 dark:border-amber-900/60 shadow-sm'
                            : isApproved
                            ? 'bg-white dark:bg-[#1A1A1A] border-emerald-300 dark:border-emerald-900/50'
                            : 'bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-zinc-800 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col gap-3">
                          {/* Card Header: Name + Status Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                  {req.name}
                                </h3>
                                {req.rollNumber && (
                                  <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-md">
                                    {req.rollNumber}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Applied: {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                isPending
                                  ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                                  : isApproved
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>

                          {/* Academic Target Info */}
                          <div className="p-3 bg-white/80 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl flex flex-col gap-1 text-[12px]">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                              <span>🏛️</span>
                              <span className="truncate">{req.college}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400 font-medium">
                              <span>📚</span>
                              <span>{req.branch} · Sem {req.semester} · Sec {req.section || 'A'}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 pt-0.5 truncate">
                              Batch Key: {req.batchKey}
                            </div>
                          </div>

                          {/* Contact Details */}
                          <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium text-slate-600 dark:text-zinc-400">
                            {req.email && (
                              <a
                                href={`mailto:${req.email}`}
                                className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-2"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>{req.email}</span>
                              </a>
                            )}
                            {req.phone && (
                              <a
                                href={`https://wa.me/${req.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>WhatsApp: {req.phone}</span>
                              </a>
                            )}
                          </div>

                          {/* Reason / Proof Note */}
                          {req.note && (
                            <div className="text-[12px] text-slate-700 dark:text-zinc-300 italic bg-slate-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800/50">
                              &ldquo;{req.note}&rdquo;
                            </div>
                          )}
                        </div>

                        {/* Action Footer */}
                        <div className="pt-3 border-t border-slate-200/80 dark:border-zinc-800 flex items-center justify-end gap-2">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleRejectCRRequest(req)}
                                className="px-3 py-1.5 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleApproveCRRequest(req)}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded-lg flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve as Batch Pilot
                              </button>
                            </>
                          ) : isApproved ? (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verified Batch Pilot
                              </span>
                              <button
                                onClick={() => handleRejectCRRequest(req)}
                                className="text-[11px] text-rose-500 hover:underline uppercase font-bold cursor-pointer"
                              >
                                Revoke Pilot
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleApproveCRRequest(req)}
                              className="text-[11px] text-emerald-600 hover:underline uppercase font-bold cursor-pointer"
                            >
                              Re-approve as Batch Pilot
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      <AnimatePresence>
        {showCampaignModal && (
          <div className="fixed inset-0 z-50 bg-[#F7F7F5] dark:bg-[#111111] overflow-y-auto font-sans">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="min-h-screen flex flex-col max-w-4xl mx-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between py-6 px-4 sm:px-8 border-b border-[#D8D8D8] dark:border-[#333333] sticky top-0 bg-[#F7F7F5] dark:bg-[#111111] z-20">
                <div>
                  <h3 className="text-[24px] sm:text-[32px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-none">
                    {editingCampaignId ? 'Edit Campaign' : 'Launch Campaign'}
                  </h3>
                  <p className="text-[14px] text-[#6F6F6F] mt-2">
                    Configure your promo banner, link, and target audience.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider hover:opacity-70 transition-opacity cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>

              <form onSubmit={handleSaveCampaign} className="flex flex-col flex-1 px-4 sm:px-8 py-8 gap-12">
                
                {/* 1. CAMPAIGN DETAILS */}
                <section className="flex flex-col gap-6">
                  <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333]">
                    01 Campaign Details
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Campaign title <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={campaignForm.title}
                        onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                        className="w-full px-4 py-3 bg-white dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333] text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors rounded-none placeholder:text-[#999999]"
                        placeholder="Official Batch '26 Hoodie Drop"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Tagline</label>
                      <input
                        type="text"
                        value={campaignForm.subtitle}
                        onChange={(e) => setCampaignForm({ ...campaignForm, subtitle: e.target.value })}
                        className="w-full px-4 py-3 bg-white dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333] text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors rounded-none placeholder:text-[#999999]"
                        placeholder="Limited pre-orders open now"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Category</label>
                      <select
                        value={campaignForm.category}
                        onChange={(e) => setCampaignForm({ ...campaignForm, category: e.target.value as any })}
                        className="w-full px-4 py-3 bg-white dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333] text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors rounded-none appearance-none"
                      >
                        <option value="General Spotlight">General Spotlight</option>
                        <option value="Placement Drive">Placement Drive</option>
                        <option value="Club Recruitment">Club Recruitment</option>
                        <option value="Event Promotion">Event Promotion</option>
                        <option value="Academic Notice">Academic Notice</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">CTA button text</label>
                      <input
                        type="text"
                        value={campaignForm.ctaText}
                        onChange={(e) => setCampaignForm({ ...campaignForm, ctaText: e.target.value })}
                        className="w-full px-4 py-3 bg-white dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333] text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors rounded-none placeholder:text-[#999999]"
                        placeholder="Learn More"
                      />
                    </div>
                  </div>
                </section>

                {/* 2. CREATIVE & DESTINATION */}
                <section className="flex flex-col gap-6">
                  <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333]">
                    02 Creative & Destination
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Destination link <span className="text-red-500">*</span></label>
                    <input
                      type="url"
                      required
                      value={campaignForm.targetUrl}
                      onChange={(e) => setCampaignForm({ ...campaignForm, targetUrl: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333] text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors rounded-none placeholder:text-[#999999]"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Banner image</label>
                    {campaignForm.imageUrl ? (
                      <div className="relative w-full aspect-[21/9] bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={campaignForm.imageUrl} alt="Banner" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setCampaignForm({ ...campaignForm, imageUrl: '' })}
                          className="absolute top-2 right-2 p-2 bg-[#111111] text-[#FFFFFF] hover:bg-black transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <label className="relative w-full py-12 border-2 border-dashed border-[#D8D8D8] dark:border-[#333333] flex flex-col items-center justify-center gap-3 text-[#6F6F6F] hover:border-[#111111] dark:hover:border-[#FFFFFF] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors cursor-pointer bg-white dark:bg-[#1A1A1A]">
                          <Upload className="w-6 h-6" />
                          <span className="text-[13px] font-medium">Click to upload image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setCampaignForm({ ...campaignForm, imageUrl: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </section>

                {/* 3. TARGETING */}
                <section className="flex flex-col gap-6">
                  <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333]">
                    03 Audience Targeting
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="flex items-center gap-3 cursor-pointer p-4 border border-[#D8D8D8] dark:border-[#333333] bg-white dark:bg-[#1A1A1A]">
                      <input
                        type="radio"
                        checked={campaignForm.targetAudienceType === 'all'}
                        onChange={() => setCampaignForm({ ...campaignForm, targetAudienceType: 'all' })}
                        className="w-4 h-4 accent-[#111111] dark:accent-[#FFFFFF]"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF]">Everyone</span>
                        <span className="text-[12px] text-[#6F6F6F]">Show to all active users on Intersemester</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-4 border border-[#D8D8D8] dark:border-[#333333] bg-white dark:bg-[#1A1A1A]">
                      <input
                        type="radio"
                        checked={campaignForm.targetAudienceType === 'custom'}
                        onChange={() => setCampaignForm({ ...campaignForm, targetAudienceType: 'custom' })}
                        className="w-4 h-4 accent-[#111111] dark:accent-[#FFFFFF]"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF]">Specific Audience</span>
                        <span className="text-[12px] text-[#6F6F6F]">Filter by college, branch, and semester</span>
                      </div>
                    </label>
                  </div>

                  {campaignForm.targetAudienceType === 'custom' && (
                    <div className="flex flex-col gap-6 p-6 border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#111111]">
                      
                      {/* Colleges */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Target Colleges</label>
                          <span className="text-[11px] text-[#6F6F6F]">
                            {campaignForm.targetColleges.length} selected
                          </span>
                        </div>

                        {/* Search and Add College */}
                        <div className="relative">
                          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333]">
                            <Search className="w-4 h-4 text-[#888888] shrink-0" />
                            <input
                              type="text"
                              value={campaignCollegeQuery}
                              onChange={(e) => {
                                setCampaignCollegeQuery(e.target.value);
                                setShowCampaignCollegeDropdown(true);
                              }}
                              onFocus={() => setShowCampaignCollegeDropdown(true)}
                              placeholder="Search verified college (e.g. SRM, IIT, IIIT, VIT) to target..."
                              className="w-full bg-transparent text-[13px] focus:outline-none placeholder:text-[#888888]"
                            />
                            {campaignCollegeQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  toggleCollegeSelection(campaignCollegeQuery.trim());
                                  setCampaignCollegeQuery('');
                                  setShowCampaignCollegeDropdown(false);
                                }}
                                className="px-2 py-1 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[11px] font-bold uppercase shrink-0"
                              >
                                Add
                              </button>
                            )}
                          </div>

                          {showCampaignCollegeDropdown && (suggestedCampaignColleges.length > 0 || isSearchingColleges) && (
                            <div className="absolute top-full left-0 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] shadow-xl z-50 divide-y divide-[#E5E5E5] dark:divide-[#2C2C2C]">
                              <div className="p-2 bg-[#F9F9F8] dark:bg-[#161616] text-[10px] font-bold uppercase tracking-wider text-[#888888] flex items-center justify-between sticky top-0">
                                <span>{isSearchingColleges ? 'Searching SheerID...' : 'Search Results'}</span>
                                <span className="text-[8.5px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 font-mono font-bold">SheerID Verified</span>
                              </div>
                              {suggestedCampaignColleges.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onMouseDown={() => {
                                    toggleCollegeSelection(item.name);
                                    setCampaignCollegeQuery('');
                                    setShowCampaignCollegeDropdown(false);
                                  }}
                                  className="w-full px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors cursor-pointer flex flex-col"
                                >
                                  <span className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                                    {item.name}
                                  </span>
                                  {item.state && (
                                    <span className="text-[10.5px] text-[#888888]">
                                      {item.state}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Selected & Quick College Badges */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {allAvailableColleges.map((college) => {
                            const isSelected = campaignForm.targetColleges.includes(college);
                            return (
                              <button
                                key={college}
                                type="button"
                                onClick={() => toggleCollegeSelection(college)}
                                className={`px-3 py-1.5 text-[12px] font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? 'border-[#111111] bg-[#111111] text-[#FFFFFF] dark:border-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111]'
                                    : 'border-[#D8D8D8] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] hover:border-[#111111] dark:hover:border-[#FFFFFF] bg-white dark:bg-[#1A1A1A]'
                                }`}
                              >
                                <span>{college}</span>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Branches */}
                      {campaignForm.targetColleges.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Branches</label>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={campaignForm.branchTargeting === 'all'}
                                onChange={() => setCampaignForm({ ...campaignForm, branchTargeting: 'all', targetBranches: [] })}
                                className="w-3.5 h-3.5 accent-[#111111] dark:accent-[#FFFFFF]"
                              />
                              <span className="text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF]">All branches</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={campaignForm.branchTargeting === 'custom'}
                                onChange={() => setCampaignForm({ ...campaignForm, branchTargeting: 'custom' })}
                                className="w-3.5 h-3.5 accent-[#111111] dark:accent-[#FFFFFF]"
                              />
                              <span className="text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF]">Specific branches</span>
                            </label>
                          </div>

                          {campaignForm.branchTargeting === 'custom' && (
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-wrap gap-2">
                                {Array.from(new Set([
                                  ...availableBranches,
                                  ...usersList
                                    .filter(u => campaignForm.targetColleges.includes(u.profile?.college || u.college))
                                    .map(u => u.profile?.branch || u.branch)
                                    .filter(Boolean),
                                  ...batchesList
                                    .filter(b => campaignForm.targetColleges.includes(b.college))
                                    .map(b => b.branch)
                                    .filter(Boolean)
                                ])).map(branch => {
                                  const isSelected = campaignForm.targetBranches.includes(branch);
                                  return (
                                    <button
                                      key={branch}
                                      type="button"
                                      onClick={() => toggleBranchSelection(branch)}
                                      className={`px-3 py-1.5 text-[12px] font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                                        isSelected
                                          ? 'border-[#111111] bg-[#111111] text-[#FFFFFF] dark:border-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111]'
                                          : 'border-[#D8D8D8] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] hover:border-[#111111] dark:hover:border-[#FFFFFF] bg-white dark:bg-[#1A1A1A]'
                                      }`}
                                    >
                                      <span>{branch}</span>
                                      {isSelected && <Check className="w-3.5 h-3.5" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Semesters */}
                      {campaignForm.targetColleges.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Semesters</label>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={campaignForm.semesterTargeting === 'all'}
                                onChange={() => setCampaignForm({ ...campaignForm, semesterTargeting: 'all', targetSemesters: [] })}
                                className="w-3.5 h-3.5 accent-[#111111] dark:accent-[#FFFFFF]"
                              />
                              <span className="text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF]">All semesters</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={campaignForm.semesterTargeting === 'custom'}
                                onChange={() => setCampaignForm({ ...campaignForm, semesterTargeting: 'custom' })}
                                className="w-3.5 h-3.5 accent-[#111111] dark:accent-[#FFFFFF]"
                              />
                              <span className="text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF]">Specific semesters</span>
                            </label>
                          </div>

                          {campaignForm.semesterTargeting === 'custom' && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                                const isSelected = campaignForm.targetSemesters.includes(sem);
                                return (
                                  <button
                                    key={sem}
                                    type="button"
                                    onClick={() => toggleSemesterSelection(sem)}
                                    className={`px-4 py-2 text-[13px] font-medium border transition-colors ${
                                      isSelected
                                        ? 'border-[#111111] bg-[#111111] text-[#FFFFFF] dark:border-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111]'
                                        : 'border-[#D8D8D8] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] hover:border-[#111111] dark:hover:border-[#FFFFFF] bg-white dark:bg-[#1A1A1A]'
                                    }`}
                                  >
                                    Sem {sem}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reach Estimate */}
                  <div className="p-6 bg-white dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] mt-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#A0A0A0]">Estimated Reach</span>
                      <span className="text-[24px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                        {(() => {
                          if (campaignForm.targetAudienceType === 'all') return `${usersList.length} students (Everyone)`;
                          if (campaignForm.targetColleges.length === 0) return '0 students';
                          
                          let matchCount = 0;
                          const matchedUserIds = new Set<string>();

                          usersList.forEach(u => {
                            const p = u.profile || u || {};
                            const userCollege = (p.college || u.college || '').toLowerCase().trim();
                            const userBranch = (p.branch || u.branch || '').toLowerCase().trim();
                            const userSem = String(p.semester || u.semester || '').replace(/[^0-9]/g, '');

                            if (!userCollege) return;

                            const cMatch = campaignForm.targetColleges.some(tc => {
                              const target = tc.toLowerCase().trim();
                              return (
                                userCollege === target ||
                                userCollege.includes(target) ||
                                target.includes(userCollege) ||
                                (userCollege.includes('naya raipur') && target.includes('naya raipur')) ||
                                (userCollege.includes('iiit-nr') && target.includes('naya raipur')) ||
                                (userCollege.includes('iiit') && target.includes('iiit') && userCollege.includes('raipur') && target.includes('raipur'))
                              );
                            });

                            const bMatch = campaignForm.branchTargeting === 'all' || campaignForm.targetBranches.some(tb => {
                              const targetB = tb.toLowerCase().trim();
                              return !userBranch || userBranch.includes(targetB) || targetB.includes(userBranch);
                            });

                            const sMatch = campaignForm.semesterTargeting === 'all' || campaignForm.targetSemesters.some(ts => {
                              return !userSem || String(ts) === userSem;
                            });

                            if (cMatch && bMatch && sMatch) {
                              matchedUserIds.add(u.id);
                              matchCount++;
                            }
                          });

                          return `~${matchCount} students`;
                        })()}
                      </span>
                    </div>
                  </div>
                </section>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-[#D8D8D8] dark:border-[#333333] mt-4 mb-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      campaignForm.isActive = false;
                      handleSaveCampaign(e as any);
                    }}
                    className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] hover:border-[#111111] dark:hover:border-[#FFFFFF] transition-colors cursor-pointer text-[13px] font-bold uppercase tracking-[1.5px]"
                  >
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      campaignForm.isActive = true;
                      handleSaveCampaign(e as any);
                    }}
                    className="w-full sm:w-auto px-12 py-4 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] font-bold text-[13px] uppercase tracking-[1.5px] hover:opacity-90 transition-opacity cursor-pointer rounded-none"
                  >
                    Publish Campaign
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
