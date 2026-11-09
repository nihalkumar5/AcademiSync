'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { isUserSuperAdmin } from '@/lib/adminAuth';
import { collection, onSnapshot, doc, getDoc, getDocs, updateDoc, setDoc, deleteDoc, query, orderBy, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PromotionalCampaign, CampaignCategory, AdminRole } from '@/lib/types';
import { searchCollegesAsync, CollegeItem, POPULAR_INDIAN_COLLEGES } from '@/lib/collegeDirectory';
import { getShortCollegeName } from '@/lib/timetableUtils';
import { PLAY_STORE_URL } from '@/lib/shareUtils';
import { getAuthHeaders } from '@/lib/authHeaders';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CampaignComposer, CampaignFormState, EMPTY_CAMPAIGN_FORM } from '@/components/admin/CampaignComposer';
import { isCampaignRunning, getCategoryMeta } from '@/components/ads/CampusSpotlightCard';
import { btn, surface, divider, muted, strong, PageTitle, SectionHead, Badge, StatTile, Segmented, SearchField, Empty, AttentionRow, timeAgo } from '@/components/admin/AdminUI';
import {
  Shield,
  Users,
  Building2,
  GraduationCap,
  Layers,
  Megaphone,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
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
  Clock,
  Copy,
  Share2,
  MessageSquare,
  Inbox,
  Pause,
  Play,
  Wrench,
  KeyRound,
  UserCog,
  Star,
} from '@/components/ui/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';

type AdminTab = 'overview' | 'users' | 'batches' | 'campaigns' | 'cr_requests' | 'messages';

export default function SuperAdminPage() {
  const router = useRouter();
  const { profile, showToast, user, isClerkLoaded } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [batchesList, setBatchesList] = useState<any[]>([]);
  const [campaignsList, setCampaignsList] = useState<PromotionalCampaign[]>([]);
  const [crRequestsList, setCrRequestsList] = useState<any[]>([]);
  const [crStatusFilter, setCrStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'read'>('all');

  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchBatchQuery, setSearchBatchQuery] = useState('');
  const [copiedBatchCode, setCopiedBatchCode] = useState<string | null>(null);

  // College-wise arrangement and filter states
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'cr' | 'faculty' | 'pro' | 'student'>('ALL');
  const [collapsedColleges, setCollapsedColleges] = useState<Record<string, boolean>>({});

  // Custom in-theme delete confirmation states
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [isDeletingCampaign, setIsDeletingCampaign] = useState(false);

  // CR Approval Success Modal state
  const [approvedSuccessData, setApprovedSuccessData] = useState<{
    name: string;
    phone?: string;
    college: string;
    branch: string;
    semester: number | string;
    batchCode: string;
    batchKey: string;
  } | null>(null);
  const [copiedSuccessCode, setCopiedSuccessCode] = useState(false);
  const [copiedSuccessMessage, setCopiedSuccessMessage] = useState(false);

  // Modal for Campaign creation/editing
  const [activeRoleDropdown, setActiveRoleDropdown] = useState<string | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState<CampaignFormState>(EMPTY_CAMPAIGN_FORM);
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'live' | 'paused' | 'ended'>('all');
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: any; role: AdminRole } | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<any | null>(null);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  
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

  // 2. Stream Shared Batches from Firestore & auto-backfill 6-char inviteCode
  useEffect(() => {
    if (!isAdmin) return;
    try {
      const unsubscribe = onSnapshot(collection(db, 'shared_timetables'), (snapshot) => {
        const fetched: any[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (!data.inviteCode) {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let generatedCode = '';
            for (let i = 0; i < 6; i++) {
              generatedCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            data.inviteCode = generatedCode;
            updateDoc(doc(db, 'shared_timetables', d.id), { inviteCode: generatedCode }).catch((err) => {
              console.warn('Could not auto-assign inviteCode for batch:', d.id, err);
            });
          }
          fetched.push({ id: d.id, ...data });
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
      }, (err) => {
        console.warn('Error fetching campaigns with orderBy, falling back:', err);
        // Fallback without orderBy index
        onSnapshot(collection(db, 'promotional_campaigns'), (snap) => {
          const fetched: PromotionalCampaign[] = [];
          snap.forEach((d) => {
            fetched.push({ id: d.id, ...d.data() } as PromotionalCampaign);
          });
          setCampaignsList(fetched);
        }, (err2) => {
          console.warn('Error fetching campaigns without orderBy:', err2);
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

  // 5. Stream Support / Contact Messages from Firestore
  useEffect(() => {
    if (!isAdmin) return;
    try {
      const unsubscribe = onSnapshot(collection(db, 'contact_messages'), (snapshot) => {
        const fetched: any[] = [];
        snapshot.forEach((d) => {
          fetched.push({ id: d.id, ...d.data() });
        });
        fetched.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setMessagesList(fetched);
      }, (err) => console.error('Error fetching contact messages:', err));

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



  // Handlers for User Role Updates
  const [isCleaningDb, setIsCleaningDb] = useState(false);

  // Firestore rejections get a human reason; permission errors almost always mean rules or account
  const reportAdminError = (action: string, e: any) => {
    console.error(`[Control Center] ${action} failed:`, e);
    const denied = e?.code === 'permission-denied' || /insufficient permissions/i.test(String(e?.message || ''));
    showToast(
      `${action} failed`,
      denied
        ? 'Firestore blocked it. Sign in with a verified super admin email, and make sure the latest rules are deployed.'
        : 'Check your connection and try again.',
      'error'
    );
  };

  // Campus admins manage one college (the one on their profile). Done on the server so the scope can't be self-edited.
  const handleCampusAdminChange = async (u: any, targetRole: AdminRole) => {
    try {
      const assign = targetRole === 'campus_admin';
      const res = await fetch('/api/admin/campus-admins', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: assign ? 'assign' : 'revoke', userId: u.id, linkedDocIds: u.linkedDocIds || [], nextRole: targetRole }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not update campus admin');
      if (!assign && targetRole !== 'student') await handleUpdateUserRole(u.id, targetRole, u.linkedDocIds);
      showToast(assign ? 'Campus admin added' : 'Campus admin removed', assign ? `Manages ${json.college}` : `Now ${roleLabel(targetRole).toLowerCase()}`, 'success');
    } catch (e: any) {
      showToast('Could not change role', e.message || 'Please try again.', 'error');
    }
  };

  const handleUpdateUserRole = async (userId: string, targetRole: AdminRole, linkedDocIds?: string[]) => {
    try {
      const targetUser = usersList.find(u => u.id === userId);
      const idsToUpdate = linkedDocIds && linkedDocIds.length > 0 ? linkedDocIds : [userId];

      for (const id of idsToUpdate) {
        const userRef = doc(db, 'users', id);
        await updateDoc(userRef, {
          'profile.role': targetRole,
        });
      }

      // If user is synced to a batch, we MUST update the batch document as well
      // Otherwise, the user will retain/lack CR powers because the batch doc is the source of truth
      if (targetUser?.profile?.isBatchSynced && targetUser?.profile?.batchKey) {
        const batchRef = doc(db, 'shared_timetables', targetUser.profile.batchKey);
        const emailToMatch = targetUser.profile.email || '';
        if (targetRole === 'student') {
          await updateDoc(batchRef, {
            crUserIds: arrayRemove(...idsToUpdate),
            ...(emailToMatch ? { crEmails: arrayRemove(emailToMatch) } : {}),
          });
        } else if (targetRole === 'cr' || targetRole === 'super_admin') {
          await updateDoc(batchRef, {
            crUserIds: arrayUnion(...idsToUpdate),
            ...(emailToMatch ? { crEmails: arrayUnion(emailToMatch) } : {}),
          });
        }
      }

      showToast('Role updated', `Now ${targetRole === 'cr' ? 'batch pilot' : targetRole.replace('_', ' ')}`, 'success');
    } catch (e) {
      reportAdminError('Role change', e);
    }
  };

  const handleToggleUserPro = async (userId: string, currentProStatus: boolean, linkedDocIds?: string[]) => {
    try {
      const idsToUpdate = linkedDocIds && linkedDocIds.length > 0 ? linkedDocIds : [userId];
      for (const id of idsToUpdate) {
        const userRef = doc(db, 'users', id);
        await updateDoc(userRef, {
          'profile.isPro': !currentProStatus,
        });
      }
      showToast(!currentProStatus ? 'Pro turned on' : 'Pro turned off', '', 'success');
    } catch (e) {
      reportAdminError('Pro change', e);
    }
  };

  const handleCleanDatabase = async () => {
    if (!isAdmin || isCleaningDb) return;
    const confirmClean = window.confirm(
      'Clean up accounts?\n\nThis merges duplicate logins of the same student into one profile and deletes empty test accounts. Deleted duplicates cannot be restored.'
    );
    if (!confirmClean) return;

    setIsCleaningDb(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const rawList: any[] = [];
      snap.forEach(d => rawList.push({ id: d.id, ...d.data() }));

      const byKey = new Map<string, any[]>();
      let ghostCount = 0;
      let dupCount = 0;
      let failedCount = 0;

      for (const u of rawList) {
        const p = u.profile || {};
        const email = (p.email || '').trim().toLowerCase();
        const roll = (p.rollNumber || '').trim().toLowerCase();
        const name = (p.name || '').trim().toLowerCase();
        const college = (p.college || '').trim().toLowerCase();

        const hasBatch = !!(p.batchKey || p.batchCode || p.isBatchSynced || u.batchKey);
        const hasFCM = !!u.fcmToken || (Array.isArray(u.webPushTokens) && u.webPushTokens.length > 0);
        const isDemo = college.includes('demo');
        const hasActiveProfile = !!p.onboardingCompleted || (!!college && !isDemo && !!p.branch);

        // 1. Ghost / Empty Demo accounts purge (Only truly abandoned bounce sessions or demo entries)
        const isGhost = isDemo || (
          !email && 
          !roll && 
          (!name || name === 'student' || name === 'anonymous') && 
          !hasBatch && 
          !hasFCM && 
          !hasActiveProfile
        );

        if (isGhost) {
          const removed = await deleteDoc(doc(db, 'users', u.id)).then(() => true, (err) => { failedCount++; console.error('[Control Center] cleanup delete failed:', err); return false; });
          if (removed) ghostCount++;
          continue;
        }

        const key = email || (roll ? `roll_${roll}` : null) || (u.fcmToken ? `fcm_${u.fcmToken}` : null);
        if (key) {
          if (!byKey.has(key)) byKey.set(key, []);
          byKey.get(key)!.push(u);
        }
      }

      // 2. Duplicate consolidation
      for (const docs of Array.from(byKey.values())) {
        if (docs.length <= 1) continue;

        // Sort so newest active Firebase doc is first
        docs.sort((a, b) => {
          const isClerkA = a.id?.startsWith('user_');
          const isClerkB = b.id?.startsWith('user_');
          if (isClerkA && !isClerkB) return 1;
          if (!isClerkA && isClerkB) return -1;
          const timeA = new Date(a.lastUpdated || a.updatedAt || a.profile?.createdAt || 0).getTime() || 0;
          const timeB = new Date(b.lastUpdated || b.updatedAt || b.profile?.createdAt || 0).getTime() || 0;
          return timeB - timeA;
        });

        const primary = docs[0];
        const primaryProfile = { ...(primary.profile || {}) };

        for (const d of docs.slice(1)) {
          const p = d.profile || {};
          if (!primaryProfile.rollNumber && p.rollNumber) primaryProfile.rollNumber = p.rollNumber;
          if ((!primaryProfile.name || primaryProfile.name.toLowerCase() === 'student') && p.name && p.name.toLowerCase() !== 'student') primaryProfile.name = p.name;
          if (p.role === 'super_admin') primaryProfile.role = 'super_admin';
          else if (p.role === 'cr' && primaryProfile.role !== 'super_admin') primaryProfile.role = 'cr';
          if (p.isPro) primaryProfile.isPro = true;
          if (!primaryProfile.college && p.college) primaryProfile.college = p.college;
          if (!primaryProfile.branch && p.branch) primaryProfile.branch = p.branch;
          if (!primaryProfile.batchKey && p.batchKey) primaryProfile.batchKey = p.batchKey;

          const merged = await deleteDoc(doc(db, 'users', d.id)).then(() => true, (err) => { failedCount++; console.error('[Control Center] cleanup merge failed:', err); return false; });
          if (merged) dupCount++;
        }

        await updateDoc(doc(db, 'users', primary.id), {
          profile: primaryProfile
        }).catch((err) => { failedCount++; console.error('[Control Center] cleanup update failed:', err); });
      }

      if (failedCount) {
        showToast('Cleanup partly failed', `${failedCount} changes were blocked. Merged ${dupCount}, removed ${ghostCount}.`, 'warning');
      } else {
        showToast('Cleanup done', `Merged ${dupCount} duplicate logins, removed ${ghostCount} empty accounts.`, 'success');
      }
    } catch (e) {
      console.error('Database hygiene error:', e);
      showToast('Cleanup Failed', 'Could not complete database cleanup.', 'error');
    } finally {
      setIsCleaningDb(false);
    }
  };

  const handleDeleteBatch = (batchId: string) => {
    setBatchToDelete(batchId);
  };

  const confirmDeleteBatch = async () => {
    if (!batchToDelete) return;
    setIsDeletingBatch(true);
    try {
      await deleteDoc(doc(db, 'shared_timetables', batchToDelete));
      showToast('Batch Removed', `Batch ${batchToDelete} was deleted`, 'info');
      setBatchToDelete(null);
    } catch (e) {
      reportAdminError('Batch delete', e);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleCopyBatchCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedBatchCode(code);
    showToast('Copied!', `Batch code "${code}" copied to clipboard`, 'success');
    setTimeout(() => setCopiedBatchCode(null), 2000);
  };

  const handleGenerateBatchCode = async (batchId: string) => {
    try {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      await updateDoc(doc(db, 'shared_timetables', batchId), {
        inviteCode: code,
      });
      showToast('Code Generated', `Batch code "${code}" assigned to ${batchId}`, 'success');
    } catch (e) {
      reportAdminError('Join code', e);
    }
  };

  const getCRWhatsAppShareUrl = (data: {
    name: string;
    phone?: string;
    college: string;
    branch: string;
    semester: number | string;
    batchCode: string;
  }) => {
    const cleanPhone = (data.phone || '').replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    
    const msg = `Hey ${data.name}! 👋\n\nCongratulations, your Batch Pilot application for *${getShortCollegeName(data.college)}* (*${data.branch}*, Sem ${data.semester}) has been *Approved* on Intersemester! 👑\n\n🔑 *Official Batch Code:* ${data.batchCode}\n\n📲 *Download App on Play Store:*\n${PLAY_STORE_URL}\n\n👉 Open Intersemester App → Tap *Connect Batch* → Enter Code: *${data.batchCode}*\n\nYou can now log in, set up your timetable, cancel classes, and send instant alerts to your entire batch. Let's make campus life smoother! 🚀`;

    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  };

  const getCRWhatsAppMessageText = (data: {
    name: string;
    phone?: string;
    college: string;
    branch: string;
    semester: number | string;
    batchCode: string;
  }) => {
    return `Hey ${data.name}! 👋\n\nCongratulations, your Batch Pilot application for *${getShortCollegeName(data.college)}* (*${data.branch}*, Sem ${data.semester}) has been *Approved* on Intersemester! 👑\n\n🔑 *Official Batch Code:* ${data.batchCode}\n\n📲 *Download App on Play Store:*\n${PLAY_STORE_URL}\n\n👉 Open Intersemester App → Tap *Connect Batch* → Enter Code: *${data.batchCode}*\n\nYou can now log in, set up your timetable, cancel classes, and send instant alerts to your entire batch. Let's make campus life smoother! 🚀`;
  };

  const handleApproveCRRequest = async (req: any) => {
    try {
      showToast('Approving...', `Processing Batch Pilot approval for ${req.name}...`, 'info');

      // 1. Determine or generate 6-character Batch Code
      const batchRef = doc(db, 'shared_timetables', req.batchKey);
      const batchSnap = await getDoc(batchRef);
      let batchCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      if (batchSnap.exists()) {
        const existingBatch = batchSnap.data();
        batchCode = existingBatch.inviteCode || batchCode;
        await updateDoc(batchRef, {
          inviteCode: batchCode,
          crUserIds: arrayUnion(req.userId),
          crEmails: arrayUnion(req.email || ''),
          updatedAt: new Date().toISOString(),
        });
      } else {
        await setDoc(batchRef, {
          id: req.batchKey,
          college: req.college,
          programme: req.programme || 'B.Tech',
          branch: req.branch,
          semester: req.semester,
          creatorId: req.userId,
          creatorName: req.name,
          creatorEmail: req.email,
          crUserIds: [req.userId],
          crEmails: req.email ? [req.email] : [],
          inviteCode: batchCode,
          subjects: [],
          timetable: [],
          studentCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // 2. Update CR Request document
      await updateDoc(doc(db, 'cr_requests', req.id), {
        status: 'approved',
        inviteCode: batchCode,
        approvedAt: new Date().toISOString(),
        approvedBy: user?.id || 'admin',
      });

      // 3. Update User document with CR role, batchKey, batchCode, and in-app notification
      if (req.userId) {
        try {
          const userRef = doc(db, 'users', req.userId);
          const userSnap = await getDoc(userRef);
          let existingNotifications: any[] = [];
          if (userSnap.exists()) {
            const uData = userSnap.data();
            existingNotifications = Array.isArray(uData.notifications) ? uData.notifications : [];
          }
          const newNotification = {
            id: `approved_${Date.now()}`,
            title: '👑 Batch Pilot Approved!',
            body: `Your batch is approved! Official Batch Code: ${batchCode}. Tap to copy and invite your classmates!`,
            type: 'batch_approved',
            batchCode,
            batchKey: req.batchKey,
            createdAt: new Date().toISOString(),
            read: false,
          };
          await updateDoc(userRef, {
            'profile.role': 'cr',
            'profile.isBatchSynced': true,
            'profile.batchKey': req.batchKey,
            'profile.college': req.college,
            'profile.programme': req.programme || 'B.Tech',
            'profile.branch': req.branch,
            'profile.semester': req.semester,
            'profile.section': req.section || '',
            'profile.batchCode': batchCode,
            notifications: [newNotification, ...existingNotifications].slice(0, 50),
            lastUpdated: Date.now(),
          });
        } catch (uErr) {
          console.warn('Could not update user profile doc directly:', uErr);
        }
      }

      // 4. Background push notification (best-effort, non-blocking)
      fetch('/api/admin/approve-cr', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ requestId: req.id, adminId: user?.id }),
      }).catch(() => {});

      showToast('CR Approved! 👑', `${req.name} is now verified CR for ${req.branch} (Sem ${req.semester}). Code: ${batchCode}`, 'success');

      setApprovedSuccessData({
        name: req.name,
        phone: req.phone,
        college: req.college,
        branch: req.branch,
        semester: req.semester,
        batchCode: batchCode,
        batchKey: req.batchKey,
      });
    } catch (e: any) {
      console.error('Error approving CR request:', e);
      showToast('Approval Failed', e.message || 'Could not approve CR request.', 'error');
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
  const handleSaveCampaign = async (publish: boolean): Promise<boolean> => {
    if (!campaignForm.title.trim()) {
      showToast('Add a headline', 'Every ad needs a headline.', 'warning');
      return false;
    }
    try {
      const existing = editingCampaignId ? campaignsList.find((c) => c.id === editingCampaignId) : undefined;
      const campaignId = editingCampaignId || `camp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const custom = campaignForm.targetAudienceType === 'custom';
      const payload: PromotionalCampaign = {
        id: campaignId,
        title: campaignForm.title.trim(),
        subtitle: campaignForm.subtitle.trim(),
        description: campaignForm.description,
        imageUrl: campaignForm.imageUrl,
        ctaText: campaignForm.ctaText.trim() || 'Learn more',
        targetUrl: campaignForm.targetUrl.trim(),
        category: campaignForm.category,
        badgeText: campaignForm.badgeText.trim(),
        targetAudienceType: campaignForm.targetAudienceType,
        targetColleges: custom ? campaignForm.targetColleges : [],
        targetBranches: custom && campaignForm.branchTargeting === 'custom' ? campaignForm.targetBranches : [],
        targetSemesters: custom && campaignForm.semesterTargeting === 'custom' ? campaignForm.targetSemesters : [],
        isActive: publish,
        impressions: existing?.impressions || 0,
        clicks: existing?.clicks || 0,
        createdAt: existing?.createdAt || new Date().toISOString(),
        ...(campaignForm.expiresOn ? { expiresAt: new Date(`${campaignForm.expiresOn}T23:59:59`).toISOString() } : {}),
      };
      // Full write (no merge) so clearing the end date really removes it
      await setDoc(doc(db, 'promotional_campaigns', campaignId), payload);
      showToast(publish ? 'Ad is live' : 'Ad saved as paused', payload.title, 'success');
      setEditingCampaignId(null);
      setCampaignForm(EMPTY_CAMPAIGN_FORM);
      return true;
    } catch (e) {
      reportAdminError('Saving the ad', e);
      return false;
    }
  };

  const openNewCampaign = () => {
    setEditingCampaignId(null);
    setCampaignForm(EMPTY_CAMPAIGN_FORM);
    setCampaignCollegeQuery('');
    setShowCampaignModal(true);
  };

  const handleToggleCampaignActive = async (campaign: PromotionalCampaign) => {
    try {
      const docRef = doc(db, 'promotional_campaigns', campaign.id);
      await updateDoc(docRef, {
        isActive: !campaign.isActive,
      });
      showToast(campaign.isActive ? 'Ad paused' : 'Ad is live', campaign.title, 'info');
    } catch (e) {
      reportAdminError(campaign.isActive ? 'Pausing the ad' : 'Publishing the ad', e);
    }
  };

  const handleDeleteCampaign = (campaignId: string) => {
    setCampaignToDelete(campaignId);
  };

  const confirmDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    setIsDeletingCampaign(true);
    try {
      await deleteDoc(doc(db, 'promotional_campaigns', campaignToDelete));
      showToast('Campaign Deleted', 'Campaign removed permanently', 'info');
      setCampaignToDelete(null);
    } catch (e) {
      reportAdminError('Ad delete', e);
    } finally {
      setIsDeletingCampaign(false);
    }
  };

  const openEditCampaign = (camp: PromotionalCampaign) => {
    const validCategory = getCategoryMeta(camp.category).id === camp.category ? camp.category : 'general';
    setEditingCampaignId(camp.id);
    setCampaignForm({
      ...EMPTY_CAMPAIGN_FORM,
      title: camp.title || '',
      subtitle: camp.subtitle || '',
      description: camp.description || '',
      imageUrl: camp.imageUrl || '',
      ctaText: camp.ctaText || 'Learn more',
      targetUrl: camp.targetUrl || '',
      category: validCategory,
      badgeText: camp.badgeText || '',
      targetAudienceType: camp.targetAudienceType || (camp.targetColleges?.length || camp.targetBranches?.length || camp.targetSemesters?.length ? 'custom' : 'all'),
      targetColleges: camp.targetColleges || [],
      branchTargeting: camp.targetBranches?.length ? 'custom' : 'all',
      targetBranches: camp.targetBranches || [],
      semesterTargeting: camp.targetSemesters?.length ? 'custom' : 'all',
      targetSemesters: camp.targetSemesters || [],
      isActive: camp.isActive,
      expiresOn: camp.expiresAt ? new Date(camp.expiresAt).toISOString().split('T')[0] : '',
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

  // Deduplicated and Cleaned Unique Students List
  const deduplicatedUsersList = useMemo(() => {
    const byKey = new Map<string, any[]>();
    const unkeyed: any[] = [];

    for (const u of usersList) {
      const p = u.profile || {};
      const email = (p.email || '').trim().toLowerCase();
      const roll = (p.rollNumber || '').trim().toLowerCase();
      const name = (p.name || '').trim().toLowerCase();
      const college = (p.college || '').trim().toLowerCase();

      const hasBatch = !!(p.batchKey || p.batchCode || p.isBatchSynced || u.batchKey);
      const hasFCM = !!u.fcmToken || (Array.isArray(u.webPushTokens) && u.webPushTokens.length > 0);
      const isDemo = college.includes('demo');
      const hasActiveProfile = !!p.onboardingCompleted || (!!college && !isDemo && !!p.branch);

      // Filter out truly abandoned ghost / empty demo test accounts.
      // A user is a ghost ONLY if they have no identity (no email/roll/custom name) AND no activity (no batch, no fcm, no real college onboarding).
      const isGhost = isDemo || (
        !email && 
        !roll && 
        (!name || name === 'student' || name === 'anonymous') && 
        !hasBatch && 
        !hasFCM && 
        !hasActiveProfile
      );

      if (isGhost) {
        continue;
      }

      const key = email || (roll ? `roll_${roll}` : null) || (u.fcmToken ? `fcm_${u.fcmToken}` : null);
      if (key) {
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push(u);
      } else {
        unkeyed.push({ ...u, linkedDocIds: [u.id] });
      }
    }

    const mergedList: any[] = [];

    for (const docs of Array.from(byKey.values())) {
      if (docs.length === 1) {
        mergedList.push({
          ...docs[0],
          linkedDocIds: [docs[0].id],
        });
        continue;
      }

      // Sort docs so that the newest active Firebase Auth doc is first
      docs.sort((a, b) => {
        const isClerkA = a.id?.startsWith('user_');
        const isClerkB = b.id?.startsWith('user_');
        if (isClerkA && !isClerkB) return 1;
        if (!isClerkA && isClerkB) return -1;

        const timeA = new Date(a.lastUpdated || a.updatedAt || a.profile?.createdAt || 0).getTime() || 0;
        const timeB = new Date(b.lastUpdated || b.updatedAt || b.profile?.createdAt || 0).getTime() || 0;
        return timeB - timeA;
      });

      const primary = docs[0];
      const primaryProfile = { ...(primary.profile || {}) };
      const allDocIds = docs.map(d => d.id);

      for (const d of docs) {
        const p = d.profile || {};
        if (!primaryProfile.rollNumber && p.rollNumber) {
          primaryProfile.rollNumber = p.rollNumber;
        }
        if ((!primaryProfile.name || primaryProfile.name.toLowerCase() === 'student') && p.name && p.name.toLowerCase() !== 'student') {
          primaryProfile.name = p.name;
        }
        if (p.role === 'super_admin') {
          primaryProfile.role = 'super_admin';
        } else if (p.role === 'cr' && primaryProfile.role !== 'super_admin') {
          primaryProfile.role = 'cr';
        }
        if (p.isPro) {
          primaryProfile.isPro = true;
        }
        if (!primaryProfile.college && p.college) {
          primaryProfile.college = p.college;
        }
        if (!primaryProfile.branch && p.branch) {
          primaryProfile.branch = p.branch;
        }
        if (!primaryProfile.batchKey && p.batchKey) {
          primaryProfile.batchKey = p.batchKey;
        }
      }

      mergedList.push({
        ...primary,
        profile: primaryProfile,
        linkedDocIds: allDocIds,
      });
    }

    return [...mergedList, ...unkeyed];
  }, [usersList]);

  // Filtered Lists from Deduplicated Users
  const filteredUsers = useMemo(() => {
    const q = searchUserQuery.toLowerCase();
    return deduplicatedUsersList.filter((u) => {
      const p = u.profile || {};
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.college || '').toLowerCase().includes(q) ||
        (p.rollNumber || '').toLowerCase().includes(q) ||
        (p.branch || '').toLowerCase().includes(q) ||
        (p.programme || '').toLowerCase().includes(q) ||
        (p.batchCode || '').toLowerCase().includes(q)
      );
    });
  }, [deduplicatedUsersList, searchUserQuery]);

  const normalizeCollegeGroup = (collegeRaw?: string): { key: string; displayName: string; shortName: string } => {
    if (!collegeRaw || !collegeRaw.trim() || collegeRaw.trim().toLowerCase() === 'not set') {
      return {
        key: 'not_set',
        displayName: 'Unassigned / College Not Set',
        shortName: 'NOT SET',
      };
    }

    const shortName = getShortCollegeName(collegeRaw);
    const clean = collegeRaw.trim();

    if (shortName !== 'COLLEGE') {
      return {
        key: shortName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        displayName: clean.length > shortName.length ? clean : shortName,
        shortName: shortName,
      };
    }

    return {
      key: clean.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      displayName: clean,
      shortName: clean.length > 25 ? clean.slice(0, 22) + '...' : clean,
    };
  };

  const allCollegeOptions = useMemo(() => {
    const map = new Map<string, { key: string; shortName: string; displayName: string; count: number }>();
    for (const u of deduplicatedUsersList) {
      const p = u.profile || {};
      const { key, shortName, displayName } = normalizeCollegeGroup(p.college);
      const existing = map.get(key) || { key, shortName, displayName, count: 0 };
      existing.count += 1;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.key === 'not_set') return 1;
      if (b.key === 'not_set') return -1;
      return b.count - a.count;
    });
  }, [deduplicatedUsersList]);

  const totalCRsCount = useMemo(() => {
    return deduplicatedUsersList.filter(u => u.profile?.role === 'cr' || u.profile?.role === 'super_admin').length;
  }, [deduplicatedUsersList]);

  const totalFacultyCount = useMemo(() => {
    return deduplicatedUsersList.filter(u => u.profile?.role === 'faculty').length;
  }, [deduplicatedUsersList]);

  const totalProCount = useMemo(() => {
    return deduplicatedUsersList.filter(u => !!u.profile?.isPro).length;
  }, [deduplicatedUsersList]);

  const collegeUserGroups = useMemo(() => {
    const map = new Map<string, {
      key: string;
      displayName: string;
      shortName: string;
      students: any[];
      totalCount: number;
      crCount: number;
      proCount: number;
    }>();

    for (const u of filteredUsers) {
      const p = u.profile || {};
      const role = p.role || 'student';
      const isPro = !!p.isPro;

      if (selectedRoleFilter === 'cr' && role !== 'cr' && role !== 'super_admin') continue;
      if (selectedRoleFilter === 'faculty' && role !== 'faculty') continue;
      if (selectedRoleFilter === 'pro' && !isPro) continue;
      if (selectedRoleFilter === 'student' && (role === 'cr' || role === 'super_admin' || role === 'faculty')) continue;

      const { key, displayName, shortName } = normalizeCollegeGroup(p.college);

      // If user selected a specific college filter, skip others
      if (selectedCollegeFilter !== 'ALL' && key !== selectedCollegeFilter) {
        continue;
      }

      if (!map.has(key)) {
        map.set(key, {
          key,
          displayName,
          shortName,
          students: [],
          totalCount: 0,
          crCount: 0,
          proCount: 0,
        });
      }

      const group = map.get(key)!;
      group.students.push(u);
      group.totalCount += 1;
      if (role === 'cr' || role === 'super_admin') group.crCount += 1;
      if (isPro) group.proCount += 1;
    }

    // Sort students inside each college group: CRs first, then alphabetical by name
    Array.from(map.values()).forEach((group) => {
      group.students.sort((a, b) => {
        const roleA = a.profile?.role || 'student';
        const roleB = b.profile?.role || 'student';
        if (roleA === 'cr' && roleB !== 'cr') return -1;
        if (roleB === 'cr' && roleA !== 'cr') return 1;
        const nameA = (a.profile?.name || '').toLowerCase();
        const nameB = (b.profile?.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.key === 'not_set') return 1;
      if (b.key === 'not_set') return -1;
      return b.totalCount - a.totalCount;
    });
  }, [filteredUsers, selectedCollegeFilter, selectedRoleFilter]);

  const estimatedReach = useMemo(() => {
    if (campaignForm.targetAudienceType === 'all') return deduplicatedUsersList.length;
    if (campaignForm.targetColleges.length === 0) return 0;
    let count = 0;
    deduplicatedUsersList.forEach((u) => {
      const p = u.profile || {};
      const userCollege = (p.college || '').toLowerCase().trim();
      const userBranch = (p.branch || '').toLowerCase().trim();
      const userSem = String(p.semester || '').replace(/[^0-9]/g, '');
      if (!userCollege) return;
      const cMatch = campaignForm.targetColleges.some((tc) => {
        const t = tc.toLowerCase().trim();
        return userCollege === t || userCollege.includes(t) || t.includes(userCollege);
      });
      const bMatch =
        campaignForm.branchTargeting === 'all' ||
        campaignForm.targetBranches.some((tb) => {
          const t = tb.toLowerCase().trim();
          return !!userBranch && (userBranch.includes(t) || t.includes(userBranch));
        });
      const sMatch = campaignForm.semesterTargeting === 'all' || campaignForm.targetSemesters.some((ts) => String(ts) === userSem);
      if (cMatch && bMatch && sMatch) count++;
    });
    return count;
  }, [campaignForm, deduplicatedUsersList]);

  const campaignCollegeOptions = useMemo(() => {
    const map = new Map<string, number>();
    deduplicatedUsersList.forEach((u) => {
      const c = (u.profile?.college || '').trim();
      if (c && !c.toLowerCase().includes('demo')) map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 12);
  }, [deduplicatedUsersList]);

  const campaignBranchOptions = useMemo(() => {
    const set = new Set<string>(availableBranches);
    deduplicatedUsersList.forEach((u) => {
      const p = u.profile || {};
      if (p.branch && (!campaignForm.targetColleges.length || campaignForm.targetColleges.some((c) => (p.college || '').toLowerCase().includes(c.toLowerCase())))) set.add(p.branch);
    });
    return Array.from(set).slice(0, 24);
  }, [deduplicatedUsersList, campaignForm.targetColleges]);

  const requestRoleChange = (u: any, role: AdminRole) => {
    const current = u.profile?.role || 'student';
    if (role === current) return;
    // Campus admin is granted/removed on the server (it scopes them to one college), always with a confirm
    if (role === 'campus_admin' || current === 'campus_admin') {
      setPendingRoleChange({ user: u, role });
      return;
    }
    // Super admin can see and change everything, so it always needs a second look
    if (role === 'super_admin' || current === 'super_admin') setPendingRoleChange({ user: u, role });
    else handleUpdateUserRole(u.id, role, u.linkedDocIds);
  };

  const filteredBatches = batchesList.filter((b) => {
    const q = searchBatchQuery.toLowerCase();
    return (
      (b.college || '').toLowerCase().includes(q) ||
      (b.branch || '').toLowerCase().includes(q) ||
      (b.programme || '').toLowerCase().includes(q) ||
      (b.id || '').toLowerCase().includes(q) ||
      (b.inviteCode || '').toLowerCase().includes(q)
    );
  });

  // 1. Loading state (Clerk / Auth initializing)
  if (!isClerkLoaded) {
    return (
      <div 
        className="min-h-screen bg-surface text-fg flex items-center justify-center p-6"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 20px), 32px)',
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 20px), 32px)',
        }}
      >
        <div className="flex items-center gap-3 font-mono text-sm tracking-wider animate-pulse">
          <Shield className="w-5 h-5" />
          <span>AUTHENTICATING SUPER ADMIN...</span>
        </div>
      </div>
    );
  }

  // 2. Not logged in
  if (!user) {
    return (
      <div 
        className="min-h-screen bg-surface text-fg flex flex-col items-center justify-center p-6 text-center"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 20px), 32px)',
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 20px), 32px)',
        }}
      >
        <div className="w-14 h-14 border border-line-strong flex items-center justify-center mb-6">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold mb-2">Super Admin Access</h1>
        <p className="text-xs text-muted mb-6 max-w-sm">
          Sign in with your master administrator account to manage users, college batches, and direct campaigns.
        </p>
        <Link href="/sign-in">
          <button className="px-6 h-11 bg-ink text-on-ink text-[14px] font-semibold border border-line-strong cursor-pointer hover:opacity-90">
            Sign In with Admin Account
          </button>
        </Link>
      </div>
    );
  }

  // 3. Logged in but not Admin
  if (!isAdmin) {
    return (
      <div 
        className="min-h-screen bg-surface text-fg flex flex-col items-center justify-center p-6 text-center"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 20px), 32px)',
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 20px), 32px)',
        }}
      >
        <div className="w-14 h-14 border border-rose-500 text-rose-500 flex items-center justify-center mb-6">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-rose-600 dark:text-rose-400 mb-2">
          Access Restricted
        </h1>
        <p className="text-xs text-muted mb-6 max-w-md">
          Your account ({userEmail}) is not authorized to access the Super Admin Control Center.
        </p>
        <Link
          href="/"
          className="flex items-center gap-2 px-6 h-11 border border-line-strong text-[14px] font-semibold hover:bg-ink hover:text-on-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Student App</span>
        </Link>
      </div>
    );
  }

  // ---------- Derived numbers for the shell and overview ----------
  const pendingRequests = crRequestsList.filter((r) => r.status === 'pending');
  const unreadMessages = messagesList.filter((m) => (m.status || 'unread') === 'unread');
  const liveCampaigns = campaignsList.filter((c) => isCampaignRunning(c));
  const weekAgo = Date.now() - 7 * 86400000;
  const newThisWeek = deduplicatedUsersList.filter((u) => {
    const t = new Date(u.profile?.createdAt || 0).getTime();
    return t && t > weekAgo;
  }).length;
  const batchesWithoutCode = batchesList.filter((b) => !b.inviteCode).length;
  const topCampaign = [...campaignsList].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0];
  const adminFirstName = (profile?.name || user?.fullName || 'Admin').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const campaignStatus = (c: PromotionalCampaign): 'live' | 'paused' | 'ended' =>
    c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now() ? 'ended' : c.isActive ? 'live' : 'paused';
  const visibleCampaigns = campaignsList.filter((c) => campaignFilter === 'all' || campaignStatus(c) === campaignFilter);

  const roleLabel = (r?: string) => (r === 'super_admin' ? 'Super admin' : r === 'campus_admin' ? 'Campus admin' : r === 'faculty' ? 'Faculty' : r === 'cr' ? 'Batch pilot' : 'Student');
  const displayName = (p: any) => (p.name && p.name.toLowerCase() !== 'student' ? p.name : p.email ? p.email.split('@')[0] : 'Unnamed student');

  const TABS: { id: AdminTab; label: string; icon: React.ElementType; count?: number; alert?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'cr_requests', label: 'Requests', icon: Crown, count: pendingRequests.length, alert: pendingRequests.length > 0 },
    { id: 'messages', label: 'Inbox', icon: Inbox, count: unreadMessages.length, alert: unreadMessages.length > 0 },
    { id: 'campaigns', label: 'Ads', icon: Megaphone, count: liveCampaigns.length },
    { id: 'users', label: 'Students', icon: Users, count: deduplicatedUsersList.length },
    { id: 'batches', label: 'Batches', icon: Layers, count: batchesList.length },
  ];

  return (
    <div
      className="min-h-screen bg-canvas text-fg font-sans"
      style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 34px), 55px)' }}
    >
      {/* ---------- Header + navigation ---------- */}
      <header
        className="sheen sticky top-0 z-40 bg-[#FAFAF8]/90 dark:bg-[#0A0B0F]/80 backdrop-blur-xl border-b border-line"
        style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 8px), 13px)' }}
      >
        <div className="max-w-6xl mx-auto px-f4 sm:px-f5">
          <div className="flex items-center justify-between gap-3 h-14">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/" className={btn.icon} aria-label="Back to the app">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <h1 className={`text-[17px] font-semibold leading-tight ${strong}`}>Control Center</h1>
                <p className={`text-[12px] leading-tight ${muted}`}>Intersemester admin</p>
              </div>
            </div>
            <Badge tone="amber">
              <Crown className="w-3.5 h-3.5" /> Super admin
            </Badge>
          </div>

          <nav aria-label="Control Center sections" className="-mx-f4 sm:mx-0 px-f4 sm:px-0 flex gap-1 overflow-x-auto no-scrollbar">
            {TABS.map((t) => {
              const on = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  aria-current={on ? 'page' : undefined}
                  className={`relative shrink-0 h-11 px-3 inline-flex items-center gap-2 text-[14px] font-medium transition-colors cursor-pointer ${
                    on ? strong : `${muted} hover:text-fg`
                  }`}
                >
                  <t.icon className="w-4 h-4" strokeWidth={1.9} />
                  {t.label}
                  {typeof t.count === 'number' && t.count > 0 && (
                    <span
                      className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center text-[11px] font-semibold tabular-nums ${
                        t.alert ? 'bg-rose-500 text-white' : 'bg-surface-3 text-current'
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                  {on && <motion.span layoutId="admin-tab" className="absolute left-2 right-2 -bottom-px h-[2px] bg-ink" />}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-f4 sm:px-f5 pt-f5 sm:pt-f6">
        {/* ================= OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-f5 sm:gap-f6">
            <div>
              <p className={`text-[13px] font-semibold leading-none ${muted}`}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h2 className={`mt-2 text-[30px] sm:text-[38px] font-semibold tracking-tight leading-tight ${strong}`}>
                <span className={`font-normal ${muted}`}>{greeting},</span> {adminFirstName}
              </h2>
            </div>

            {/* What needs a decision comes first: the admin's job is triage */}
            <section>
              <SectionHead title="Needs attention" meta={pendingRequests.length + unreadMessages.length + batchesWithoutCode === 0 ? undefined : `${pendingRequests.length + unreadMessages.length + (batchesWithoutCode ? 1 : 0)} items`} />
              {pendingRequests.length + unreadMessages.length + batchesWithoutCode === 0 ? (
                <div className={`${surface} flex items-center gap-f3 px-f4 py-f4`}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className={`text-[15px] font-medium ${strong}`}>All clear</p>
                    <p className={`text-[13px] ${muted}`}>No pending requests or unread messages.</p>
                  </div>
                </div>
              ) : (
                <div className={`${surface} ${divider}`}>
                  {pendingRequests.length > 0 && (
                    <AttentionRow
                      icon={Crown}
                      tone="amber"
                      title={`${pendingRequests.length} batch pilot ${pendingRequests.length === 1 ? 'request' : 'requests'} to review`}
                      hint={pendingRequests.slice(0, 3).map((r) => r.name).join(', ')}
                      onClick={() => {
                        setCrStatusFilter('pending');
                        setActiveTab('cr_requests');
                      }}
                    />
                  )}
                  {unreadMessages.length > 0 && (
                    <AttentionRow
                      icon={Inbox}
                      tone="blue"
                      title={`${unreadMessages.length} unread ${unreadMessages.length === 1 ? 'message' : 'messages'}`}
                      hint={unreadMessages[0]?.subject || unreadMessages[0]?.name}
                      onClick={() => {
                        setMessageFilter('unread');
                        setActiveTab('messages');
                      }}
                    />
                  )}
                  {batchesWithoutCode > 0 && (
                    <AttentionRow
                      icon={KeyRound}
                      tone="neutral"
                      title={`${batchesWithoutCode} ${batchesWithoutCode === 1 ? 'batch has' : 'batches have'} no join code`}
                      hint="Students can't join these until a code exists"
                      onClick={() => setActiveTab('batches')}
                    />
                  )}
                </div>
              )}
            </section>

            {/* Four numbers that describe the network; each opens its detail */}
            <section>
              <SectionHead title="At a glance" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-f3">
                <StatTile label="Students" value={deduplicatedUsersList.length.toLocaleString()} hint={newThisWeek ? `+${newThisWeek} this week` : 'No new sign-ups this week'} onClick={() => setActiveTab('users')} />
                <StatTile label="Batches" value={batchesList.length} hint={`${allCollegeOptions.filter((c) => c.key !== 'not_set').length} colleges`} onClick={() => setActiveTab('batches')} />
                <StatTile label="Live ads" value={liveCampaigns.length} hint={`${campaignsList.length} total`} onClick={() => setActiveTab('campaigns')} />
                <StatTile label="Ad click rate" value={`${overallCTR}%`} hint={`${totalClicks.toLocaleString()} clicks · ${totalImpressions.toLocaleString()} views`} onClick={() => setActiveTab('campaigns')} />
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-f5">
              <div>
                <SectionHead title="Quick actions" />
                <div className={`${surface} ${divider}`}>
                  <AttentionRow icon={Megaphone} tone="neutral" title="Create an ad" hint="Promote an event, deal or drop to chosen colleges" onClick={openNewCampaign} />
                  <AttentionRow icon={UserCog} tone="neutral" title="Manage students and roles" hint="Batch pilots, faculty and Pro" onClick={() => setActiveTab('users')} />
                  <AttentionRow icon={Layers} tone="neutral" title="Review batches" hint="Join codes and shared timetables" onClick={() => setActiveTab('batches')} />
                </div>
              </div>
              <div>
                <SectionHead title="Best performing ad" />
                {topCampaign ? (
                  <button type="button" onClick={() => openEditCampaign(topCampaign)} className={`${surface} w-full text-left p-f4 hover:border-line-strong transition-colors cursor-pointer`}>
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={campaignStatus(topCampaign) === 'live' ? 'green' : 'neutral'} dot>
                        {campaignStatus(topCampaign) === 'live' ? 'Live' : campaignStatus(topCampaign) === 'ended' ? 'Ended' : 'Paused'}
                      </Badge>
                      <span className={`text-[13px] ${muted}`}>{getCategoryMeta(topCampaign.category).label}</span>
                    </div>
                    <p className={`mt-f3 text-[17px] font-semibold leading-snug ${strong}`}>{topCampaign.title}</p>
                    <div className="mt-f3 grid grid-cols-3 gap-f3">
                      {[
                        { k: 'Views', v: (topCampaign.impressions || 0).toLocaleString() },
                        { k: 'Clicks', v: (topCampaign.clicks || 0).toLocaleString() },
                        { k: 'Click rate', v: `${topCampaign.impressions ? (((topCampaign.clicks || 0) / topCampaign.impressions) * 100).toFixed(1) : '0.0'}%` },
                      ].map((m) => (
                        <div key={m.k}>
                          <p className={`text-[12px] ${muted}`}>{m.k}</p>
                          <p className={`text-[18px] font-semibold tabular-nums ${strong}`}>{m.v}</p>
                        </div>
                      ))}
                    </div>
                  </button>
                ) : (
                  <Empty icon={Megaphone} title="No ads yet" body="Your first ad will show its results here." action={<button type="button" onClick={openNewCampaign} className={btn.primary}><Plus className="w-4 h-4" /> Create an ad</button>} />
                )}
              </div>
            </section>

            {/* Rare, destructive maintenance lives apart from everyday actions */}
            <section>
              <SectionHead title="Maintenance" />
              <div className={`${surface} p-f4 flex flex-col sm:flex-row sm:items-center gap-f3 justify-between`}>
                <div className="flex items-start gap-f3">
                  <span className={`w-9 h-9 shrink-0 flex items-center justify-center border border-line-soft ${strong}`}>
                    <Wrench className="w-4 h-4" />
                  </span>
                  <div>
                    <p className={`text-[15px] font-medium ${strong}`}>Clean up accounts</p>
                    <p className={`text-[13px] max-w-md ${muted}`}>Merges duplicate logins of the same student and removes empty test accounts. Deleted duplicates can&apos;t be restored.</p>
                  </div>
                </div>
                <button type="button" onClick={handleCleanDatabase} disabled={isCleaningDb} className={`${btn.secondary} shrink-0`}>
                  {isCleaningDb ? 'Cleaning…' : 'Run cleanup'}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ================= ADS ================= */}
        {activeTab === 'campaigns' && (
          <div className="flex flex-col gap-f5">
            <PageTitle
              title="Ads"
              description="Sponsored cards on students' home screens. Pro members never see them."
              action={
                <button type="button" onClick={openNewCampaign} className={btn.primary}>
                  <Plus className="w-4 h-4" /> New ad
                </button>
              }
            />
            <div className="grid grid-cols-3 gap-f3">
              <StatTile label="Views" value={totalImpressions.toLocaleString()} />
              <StatTile label="Clicks" value={totalClicks.toLocaleString()} />
              <StatTile label="Click rate" value={`${overallCTR}%`} />
            </div>
            <Segmented
              ariaLabel="Filter ads"
              value={campaignFilter}
              onChange={setCampaignFilter}
              options={[
                { id: 'all', label: 'All', count: campaignsList.length },
                { id: 'live', label: 'Live', count: campaignsList.filter((c) => campaignStatus(c) === 'live').length },
                { id: 'paused', label: 'Paused', count: campaignsList.filter((c) => campaignStatus(c) === 'paused').length },
                { id: 'ended', label: 'Ended', count: campaignsList.filter((c) => campaignStatus(c) === 'ended').length },
              ]}
            />
            {visibleCampaigns.length === 0 ? (
              <Empty
                icon={Megaphone}
                title={campaignsList.length ? 'Nothing here' : 'No ads yet'}
                body={campaignsList.length ? 'No ads match this filter.' : 'Create a card for an event, deal or merch drop and choose who sees it.'}
                action={!campaignsList.length && <button type="button" onClick={openNewCampaign} className={btn.primary}><Plus className="w-4 h-4" /> New ad</button>}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-f3">
                {visibleCampaigns.map((c) => {
                  const st = campaignStatus(c);
                  const meta = getCategoryMeta(c.category);
                  const ctr = c.impressions ? (((c.clicks || 0) / c.impressions) * 100).toFixed(1) : '0.0';
                  const universal = c.targetAudienceType === 'all' || (!c.targetColleges?.length && !c.targetBranches?.length && !c.targetSemesters?.length);
                  const audience = universal
                    ? 'Everyone'
                    : [
                        c.targetColleges?.length ? (c.targetColleges.length === 1 ? getShortCollegeName(c.targetColleges[0]) : `${c.targetColleges.length} colleges`) : null,
                        c.targetBranches?.length ? c.targetBranches.join(', ') : null,
                        c.targetSemesters?.length ? `Sem ${c.targetSemesters.join(', ')}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ');
                  return (
                    <article key={c.id} className={`${surface} flex flex-col ${st !== 'live' ? 'opacity-80' : ''}`}>
                      <div className="flex gap-f3 p-f4">
                        <div className="w-[88px] h-[64px] shrink-0 bg-[#F1F1EF] dark:bg-white/[0.04] border border-line-soft overflow-hidden flex items-center justify-center">
                          {c.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <meta.icon className={`w-6 h-6 ${muted}`} strokeWidth={1.6} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge tone={st === 'live' ? 'green' : st === 'ended' ? 'red' : 'neutral'} dot>
                              {st === 'live' ? 'Live' : st === 'ended' ? 'Ended' : 'Paused'}
                            </Badge>
                            <span className={`text-[12px] ${muted}`}>{meta.label}</span>
                          </div>
                          <h3 className={`mt-1.5 text-[16px] font-semibold leading-snug line-clamp-2 ${strong}`}>{c.title}</h3>
                          <p className={`mt-0.5 text-[13px] truncate ${muted}`}>
                            {audience}
                            {c.expiresAt ? ` · until ${new Date(c.expiresAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto grid grid-cols-3 border-t border-line-soft divide-x divide-line-soft">
                        {[
                          { k: 'Views', v: (c.impressions || 0).toLocaleString() },
                          { k: 'Clicks', v: (c.clicks || 0).toLocaleString() },
                          { k: 'Rate', v: `${ctr}%` },
                        ].map((m) => (
                          <div key={m.k} className="px-f4 py-2.5">
                            <p className={`text-[12px] ${muted}`}>{m.k}</p>
                            <p className={`text-[15px] font-semibold tabular-nums ${strong}`}>{m.v}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-2 px-f3 py-2 border-t border-line-soft">
                        {st !== 'ended' ? (
                          <button type="button" onClick={() => handleToggleCampaignActive(c)} className={btn.ghost}>
                            {c.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {c.isActive ? 'Pause' : 'Go live'}
                          </button>
                        ) : (
                          <span className={`px-2.5 text-[13px] ${muted}`}>Edit to extend</span>
                        )}
                        <div className="flex items-center">
                          <a href={c.targetUrl} target="_blank" rel="noreferrer" className={btn.icon} aria-label="Open link">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button type="button" onClick={() => openEditCampaign(c)} className={btn.icon} aria-label={`Edit ${c.title}`}>
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDeleteCampaign(c.id)} className={`${btn.icon} hover:text-rose-600`} aria-label={`Delete ${c.title}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= REQUESTS ================= */}
        {activeTab === 'cr_requests' && (() => {
          const list = crRequestsList.filter((r) => crStatusFilter === 'all' || r.status === crStatusFilter);
          return (
            <div className="flex flex-col gap-f5">
              <PageTitle title="Batch pilot requests" description="Pilots publish the official timetable for their batch. Up to 3 per batch." />
              <Segmented
                ariaLabel="Filter requests"
                value={crStatusFilter}
                onChange={setCrStatusFilter}
                options={(['pending', 'approved', 'rejected', 'all'] as const).map((f) => ({
                  id: f,
                  label: f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1),
                  count: f === 'all' ? crRequestsList.length : crRequestsList.filter((r) => r.status === f).length,
                }))}
              />
              {list.length === 0 ? (
                <Empty icon={Crown} title={crStatusFilter === 'pending' ? 'No pending requests' : 'Nothing here'} body={crStatusFilter === 'pending' ? 'New requests from students show up here.' : undefined} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-f3">
                  {list.map((req) => {
                    const pending = req.status === 'pending';
                    const approved = req.status === 'approved';
                    return (
                      <article key={req.id} className={`${surface} flex flex-col`}>
                        <div className="p-f4 flex flex-col gap-f3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className={`text-[16px] font-semibold leading-snug ${strong}`}>{req.name}</h3>
                              <p className={`text-[13px] ${muted}`}>
                                {req.rollNumber ? `${req.rollNumber} · ` : ''}
                                {timeAgo(req.createdAt)}
                              </p>
                            </div>
                            <Badge tone={pending ? 'amber' : approved ? 'green' : 'red'} dot>
                              {pending ? 'Pending' : approved ? 'Approved' : 'Rejected'}
                            </Badge>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <Building2 className={`w-4 h-4 mt-0.5 shrink-0 ${muted}`} />
                            <div className="min-w-0">
                              <p className={`text-[14px] leading-snug ${strong}`}>{req.college}</p>
                              <p className={`text-[13px] ${muted}`}>
                                {req.branch} · Semester {req.semester}
                              </p>
                            </div>
                          </div>
                          {req.note && <p className={`text-[14px] leading-relaxed bg-surface-2 px-3 py-2 ${muted}`}>{req.note}</p>}
                          <div className="flex flex-wrap gap-x-f4 gap-y-1.5 text-[13px]">
                            {req.email && (
                              <a href={`mailto:${req.email}`} className={`inline-flex items-center gap-1.5 hover:underline underline-offset-4 ${strong}`}>
                                <Mail className="w-3.5 h-3.5" /> {req.email}
                              </a>
                            )}
                            {req.phone && (
                              <a href={`https://wa.me/${req.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-4">
                                <Phone className="w-3.5 h-3.5" /> {req.phone}
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="mt-auto flex items-center justify-end gap-2 px-f4 py-f3 border-t border-line-soft">
                          {pending ? (
                            <>
                              <button type="button" onClick={() => handleRejectCRRequest(req)} className={btn.ghost}>
                                Decline
                              </button>
                              <button type="button" onClick={() => handleApproveCRRequest(req)} className={btn.primary}>
                                <Check className="w-4 h-4" /> Approve
                              </button>
                            </>
                          ) : approved ? (
                            <>
                              <button type="button" onClick={() => handleRejectCRRequest(req)} className={`${btn.ghost} hover:text-rose-600 mr-auto`}>
                                Revoke
                              </button>
                              <button type="button" onClick={() => handleApproveCRRequest(req)} className={btn.ghost} title="Push the approved batch details to the student's profile again">
                                Re-sync
                              </button>
                              {req.inviteCode && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setApprovedSuccessData({ name: req.name, phone: req.phone, college: req.college, branch: req.branch, semester: req.semester, batchCode: req.inviteCode, batchKey: req.batchKey })
                                  }
                                  className={btn.secondary}
                                >
                                  <Share2 className="w-4 h-4" /> Share code
                                </button>
                              )}
                            </>
                          ) : (
                            <button type="button" onClick={() => handleApproveCRRequest(req)} className={btn.secondary}>
                              Approve instead
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ================= INBOX ================= */}
        {activeTab === 'messages' && (() => {
          const list = messagesList.filter((m) => messageFilter === 'all' || (m.status || 'unread') === messageFilter);
          return (
            <div className="flex flex-col gap-f5">
              <PageTitle title="Inbox" description="Messages sent from the Contact page." />
              <Segmented
                ariaLabel="Filter messages"
                value={messageFilter}
                onChange={setMessageFilter}
                options={[
                  { id: 'all' as const, label: 'All', count: messagesList.length },
                  { id: 'unread' as const, label: 'Unread', count: unreadMessages.length },
                  { id: 'read' as const, label: 'Read', count: messagesList.length - unreadMessages.length },
                ]}
              />
              {list.length === 0 ? (
                <Empty icon={Inbox} title={messageFilter === 'unread' ? 'Inbox zero' : 'No messages'} body={messageFilter === 'unread' ? 'Everything has been read.' : undefined} />
              ) : (
                <ul className={`${surface} ${divider}`}>
                  {list.map((m) => {
                    const unread = (m.status || 'unread') === 'unread';
                    const open = expandedMessage === m.id;
                    const toggleRead = async () => {
                      try {
                        await updateDoc(doc(db, 'contact_messages', m.id), { status: unread ? 'read' : 'unread' });
                      } catch (err) {
                        console.error('Error updating status:', err);
                      }
                    };
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedMessage(open ? null : m.id);
                            if (unread && !open) toggleRead();
                          }}
                          aria-expanded={open}
                          className="w-full flex items-start gap-f3 px-f4 py-f3 text-left hover:bg-surface-2 transition-colors cursor-pointer"
                        >
                          <span className={`mt-2 w-2 h-2 shrink-0 rounded-full ${unread ? 'bg-sky-500' : 'bg-transparent'}`} aria-label={unread ? 'Unread' : undefined} />
                          <span className="flex-1 min-w-0">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className={`text-[15px] truncate ${unread ? 'font-semibold' : 'font-medium'} ${strong}`}>{m.name || 'Anonymous'}</span>
                              <span className={`shrink-0 text-[12px] ${muted}`}>{timeAgo(m.createdAt)}</span>
                            </span>
                            <span className={`block text-[14px] truncate ${unread ? strong : muted}`}>{m.subject || 'General question'}</span>
                            {!open && <span className={`block text-[13px] truncate ${muted}`}>{m.message}</span>}
                          </span>
                        </button>
                        {open && (
                          <div className="px-f4 pb-f4 sm:pl-[53px]">
                            <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${strong}`}>{m.message}</p>
                            <p className={`mt-2 text-[13px] ${muted}`}>{m.email}</p>
                            <div className="mt-f3 flex flex-wrap items-center gap-2">
                              <a
                                href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'Intersemester support'}`)}&body=${encodeURIComponent(`\n\n--- ${m.name} wrote ---\n${m.message}`)}`}
                                className={btn.primary}
                              >
                                <Mail className="w-4 h-4" /> Reply
                              </a>
                              <button type="button" onClick={toggleRead} className={btn.secondary}>
                                Mark as {unread ? 'read' : 'unread'}
                              </button>
                              <button type="button" onClick={() => setMessageToDelete(m)} className={`${btn.ghost} hover:text-rose-600`}>
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })()}

        {/* ================= STUDENTS ================= */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-f5">
            <PageTitle title="Students" description="Grouped by college. Change roles and Pro access here." />
            <div className="flex flex-col lg:flex-row gap-f3">
              <SearchField value={searchUserQuery} onChange={setSearchUserQuery} placeholder="Search name, email, roll no. or batch code" className="flex-1" />
              <select
                value={selectedCollegeFilter}
                onChange={(e) => setSelectedCollegeFilter(e.target.value)}
                aria-label="College"
                className="h-11 px-3 lg:w-72 bg-surface border border-line text-[15px] text-fg focus:outline-none focus:border-line-strong cursor-pointer"
              >
                <option value="ALL">All colleges ({deduplicatedUsersList.length})</option>
                {allCollegeOptions.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.shortName} ({c.count})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented
                ariaLabel="Filter by role"
                value={selectedRoleFilter}
                onChange={setSelectedRoleFilter}
                options={[
                  { id: 'ALL' as const, label: 'Everyone', count: filteredUsers.length },
                  { id: 'cr' as const, label: 'Pilots', count: totalCRsCount },
                  { id: 'faculty' as const, label: 'Faculty', count: totalFacultyCount },
                  { id: 'pro' as const, label: 'Pro', count: totalProCount },
                  { id: 'student' as const, label: 'Students' },
                ]}
              />
              {collegeUserGroups.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const allCollapsed = collegeUserGroups.every((g) => !!collapsedColleges[g.key]);
                    const next: Record<string, boolean> = {};
                    if (!allCollapsed) collegeUserGroups.forEach((g) => (next[g.key] = true));
                    setCollapsedColleges(next);
                  }}
                  className={btn.ghost}
                >
                  {collegeUserGroups.every((g) => !!collapsedColleges[g.key]) ? 'Expand all' : 'Collapse all'}
                </button>
              )}
            </div>

            {collegeUserGroups.length === 0 ? (
              <Empty
                icon={Search}
                title="No students match"
                body="Try a different search or filter."
                action={
                  <button
                    type="button"
                    className={btn.secondary}
                    onClick={() => {
                      setSearchUserQuery('');
                      setSelectedCollegeFilter('ALL');
                      setSelectedRoleFilter('ALL');
                    }}
                  >
                    Reset filters
                  </button>
                }
              />
            ) : (
              <div className="flex flex-col gap-f4">
                {collegeUserGroups.map((group) => {
                  const collapsed = !!collapsedColleges[group.key];
                  return (
                    <section key={group.key} className={surface}>
                      <button
                        type="button"
                        onClick={() => setCollapsedColleges((p) => ({ ...p, [group.key]: !p[group.key] }))}
                        aria-expanded={!collapsed}
                        className="w-full flex items-center gap-f3 px-f4 py-f3 text-left hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <Building2 className={`w-5 h-5 shrink-0 ${muted}`} strokeWidth={1.75} />
                        <span className="flex-1 min-w-0">
                          <span className={`block text-[15px] font-semibold truncate ${strong}`}>{group.displayName}</span>
                          <span className={`block text-[13px] ${muted}`}>
                            {group.students.length} {group.students.length === 1 ? 'student' : 'students'}
                            {group.crCount ? ` · ${group.crCount} ${group.crCount === 1 ? 'pilot' : 'pilots'}` : ''}
                            {group.proCount ? ` · ${group.proCount} Pro` : ''}
                          </span>
                        </span>
                        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${collapsed ? '' : 'rotate-180'} ${muted}`} />
                      </button>
                      {!collapsed && (
                        <ul className={`border-t border-line-soft ${divider}`}>
                          {group.students.map((u) => {
                            const p = u.profile || {};
                            const role = p.role || 'student';
                            const isPro = !!p.isPro;
                            return (
                              <li key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-f3 px-f4 py-f3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[15px] font-medium ${strong}`}>{displayName(p)}</span>
                                    {role !== 'student' && <Badge tone={role === 'super_admin' ? 'red' : role === 'faculty' ? 'blue' : 'amber'}>{roleLabel(role)}</Badge>}
                                    {isPro && (
                                      <Badge tone="violet">
                                        <Star className="w-3 h-3" /> Pro
                                      </Badge>
                                    )}
                                  </div>
                                  <p className={`text-[13px] truncate ${muted}`}>
                                    {[p.email, [p.programme, p.branch].filter(Boolean).join(' '), p.semester ? `Sem ${p.semester}` : '', p.rollNumber].filter(Boolean).join(' · ') || u.id}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <select
                                    value={role}
                                    onChange={(e) => requestRoleChange(u, e.target.value as AdminRole)}
                                    aria-label={`Role for ${displayName(p)}`}
                                    className="h-9 px-2.5 bg-surface border border-line text-[13px] text-fg cursor-pointer focus:outline-none focus:border-[#111111]"
                                  >
                                    {(['student', 'cr', 'faculty', 'campus_admin', 'super_admin'] as const).map((r) => (
                                      <option key={r} value={r}>
                                        {roleLabel(r)}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isPro}
                                    aria-label={`Pro for ${displayName(p)}`}
                                    onClick={() => handleToggleUserPro(u.id, isPro, u.linkedDocIds)}
                                    className="inline-flex items-center gap-2 h-9 px-2 text-[13px] cursor-pointer"
                                  >
                                    <span className={`relative w-9 h-5 rounded-full transition-colors ${isPro ? 'bg-violet-600' : 'bg-black/15 dark:bg-white/20'}`}>
                                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPro ? 'translate-x-4' : ''}`} />
                                    </span>
                                    <span className={muted}>Pro</span>
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= BATCHES ================= */}
        {activeTab === 'batches' && (
          <div className="flex flex-col gap-f5">
            <PageTitle title="Batches" description="Shared timetables published by batch pilots. Students join with the code." />
            <SearchField value={searchBatchQuery} onChange={setSearchBatchQuery} placeholder="Search college, branch or code" />
            {filteredBatches.length === 0 ? (
              <Empty icon={Layers} title="No batches found" />
            ) : (
              <ul className={`${surface} ${divider}`}>
                {filteredBatches.map((b) => {
                  const code = b.inviteCode || '';
                  const copied = copiedBatchCode === (code || b.id);
                  return (
                    <li key={b.id} className="flex flex-col sm:flex-row sm:items-center gap-f3 px-f4 py-f3">
                      <div className="sm:w-36 shrink-0 flex items-center gap-1">
                        {code ? (
                          <>
                            <span className={`text-[18px] font-mono font-semibold tracking-[3px] select-all ${strong}`}>{code}</span>
                            <button type="button" onClick={() => handleCopyBatchCode(code)} className={btn.icon} aria-label={`Copy code ${code}`}>
                              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => handleGenerateBatchCode(b.id)} className={btn.secondary}>
                            <KeyRound className="w-4 h-4" /> Create code
                          </button>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-medium truncate ${strong}`} title={b.college}>
                          {getShortCollegeName(b.college || '') !== 'COLLEGE' ? getShortCollegeName(b.college || '') : b.college}
                          <span className={`font-normal ${muted}`}>
                            {' '}
                            · {[b.programme, b.branch].filter(Boolean).join(' ')} · Sem {b.semester}
                          </span>
                        </p>
                        <p className={`text-[13px] truncate ${muted}`}>
                          By {b.creatorName || 'unknown'} · {b.subjects?.length || 0} subjects · {b.events?.length || 0} events
                        </p>
                      </div>
                      <button type="button" onClick={() => handleDeleteBatch(b.id)} className={`${btn.ghost} hover:text-rose-600 self-start sm:self-center`} aria-label={`Delete batch ${code || b.id}`}>
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </main>

      {/* ---------- Pilot approved: hand-off sheet ---------- */}
      <AnimatePresence>
        {approvedSuccessData && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className={`${surface} w-full sm:max-w-md p-f4 sm:p-f5 relative`}
              role="dialog"
              aria-label="Batch pilot approved"
            >
              <button
                type="button"
                onClick={() => {
                  setApprovedSuccessData(null);
                  setCopiedSuccessCode(false);
                  setCopiedSuccessMessage(false);
                }}
                className={`${btn.icon} absolute top-3 right-3`}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <Badge tone="green" dot>
                Approved
              </Badge>
              <h3 className={`mt-f3 text-[22px] font-semibold tracking-tight ${strong}`}>{approvedSuccessData.name} is now a batch pilot</h3>
              <p className={`mt-1 text-[14px] ${muted}`}>
                {getShortCollegeName(approvedSuccessData.college)} · {approvedSuccessData.branch} · Semester {approvedSuccessData.semester}
              </p>
              <div className="mt-f4 p-f4 border border-dashed border-[#CFCFCB] dark:border-white/[0.16] text-center">
                <p className={`text-[13px] ${muted}`}>Batch join code</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className={`text-[32px] font-mono font-semibold tracking-[6px] select-all ${strong}`}>{approvedSuccessData.batchCode}</span>
                  <button
                    type="button"
                    className={btn.icon}
                    aria-label="Copy code"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(approvedSuccessData.batchCode);
                        setCopiedSuccessCode(true);
                        setTimeout(() => setCopiedSuccessCode(false), 2000);
                      } catch {
                        showToast("Couldn't copy", 'Copy the code by hand.', 'error');
                      }
                    }}
                  >
                    {copiedSuccessCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className={`mt-1 text-[12px] ${muted}`}>Classmates enter this to join the shared timetable</p>
              </div>
              <div className="mt-f4 flex flex-col gap-2">
                {approvedSuccessData.phone && (
                  <a href={getCRWhatsAppShareUrl(approvedSuccessData)} target="_blank" rel="noreferrer" className={`${btn.primary} h-12 bg-[#1DA851] dark:bg-[#1DA851] dark:text-white`}>
                    <MessageSquare className="w-4 h-4" /> Send on WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  className={`${btn.secondary} h-12`}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(getCRWhatsAppMessageText(approvedSuccessData));
                      setCopiedSuccessMessage(true);
                      setTimeout(() => setCopiedSuccessMessage(false), 2000);
                    } catch {
                      showToast("Couldn't copy", 'Try again.', 'error');
                    }
                  }}
                >
                  {copiedSuccessMessage ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedSuccessMessage ? 'Message copied' : 'Copy message'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- Ad composer ---------- */}
      <AnimatePresence>
        {showCampaignModal && (
          <CampaignComposer
            editing={!!editingCampaignId}
            form={campaignForm}
            setForm={setCampaignForm}
            onClose={() => {
              setShowCampaignModal(false);
              setEditingCampaignId(null);
            }}
            onSave={handleSaveCampaign}
            reach={estimatedReach}
            totalStudents={deduplicatedUsersList.length}
            collegeOptions={campaignCollegeOptions}
            branchOptions={campaignBranchOptions}
            collegeQuery={campaignCollegeQuery}
            setCollegeQuery={setCampaignCollegeQuery}
            collegeSuggestions={suggestedCampaignColleges}
            isSearchingColleges={isSearchingColleges}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!batchToDelete}
        onClose={() => setBatchToDelete(null)}
        onConfirm={confirmDeleteBatch}
        title="Delete this batch?"
        description="Its shared timetable is removed and every member loses the synced schedule. This can't be undone."
        highlightText={batchToDelete ? `Batch ${batchesList.find((b) => b.id === batchToDelete)?.inviteCode || batchToDelete}` : undefined}
        confirmLabel="Delete batch"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeletingBatch}
      />

      <ConfirmModal
        isOpen={!!campaignToDelete}
        onClose={() => setCampaignToDelete(null)}
        onConfirm={confirmDeleteCampaign}
        title="Delete this ad?"
        description="Its views and clicks are deleted with it. Pause it instead if you may run it again."
        highlightText={campaignToDelete ? campaignsList.find((c) => c.id === campaignToDelete)?.title : undefined}
        confirmLabel="Delete ad"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeletingCampaign}
      />

      <ConfirmModal
        isOpen={!!pendingRoleChange}
        onClose={() => setPendingRoleChange(null)}
        onConfirm={async () => {
          if (!pendingRoleChange) return;
          const fromCampus = (pendingRoleChange.user.profile?.role || 'student') === 'campus_admin';
          if (pendingRoleChange.role === 'campus_admin' || fromCampus) {
            await handleCampusAdminChange(pendingRoleChange.user, pendingRoleChange.role);
          } else {
            await handleUpdateUserRole(pendingRoleChange.user.id, pendingRoleChange.role, pendingRoleChange.user.linkedDocIds);
          }
          setPendingRoleChange(null);
        }}
        title={
          pendingRoleChange?.role === 'campus_admin'
            ? 'Make campus admin?'
            : pendingRoleChange?.user?.profile?.role === 'campus_admin'
            ? 'Remove campus admin?'
            : pendingRoleChange?.role === 'super_admin'
            ? 'Make super admin?'
            : 'Remove super admin?'
        }
        description={
          pendingRoleChange?.role === 'campus_admin'
            ? `They will see every student and batch from ${pendingRoleChange.user.profile?.college || 'their college'}, approve batch pilots there, and post notices (with notifications) for that college only.`
            : pendingRoleChange?.user?.profile?.role === 'campus_admin'
            ? 'They lose access to the campus admin panel.'
            : pendingRoleChange?.role === 'super_admin'
            ? 'Super admins can see every student, change roles, delete batches and run ads.'
            : 'They lose access to the Control Center.'
        }
        highlightText={pendingRoleChange ? `${displayName(pendingRoleChange.user.profile || {})} → ${roleLabel(pendingRoleChange.role)}` : undefined}
        confirmLabel={pendingRoleChange?.role === 'super_admin' ? 'Make super admin' : pendingRoleChange?.role === 'campus_admin' ? 'Make campus admin' : 'Change role'}
        cancelLabel="Cancel"
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        onConfirm={async () => {
          if (!messageToDelete) return;
          try {
            await deleteDoc(doc(db, 'contact_messages', messageToDelete.id));
            showToast('Message deleted', messageToDelete.subject || '', 'info');
          } catch (err) {
            console.error('Error deleting message:', err);
          }
          setMessageToDelete(null);
        }}
        title="Delete this message?"
        description="It's removed from the inbox for good."
        highlightText={messageToDelete ? `${messageToDelete.name || 'Anonymous'}: ${messageToDelete.subject || 'General question'}` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
