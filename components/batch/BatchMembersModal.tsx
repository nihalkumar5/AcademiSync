'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useApp } from '@/context/AppContext';
import { isUserSuperAdmin } from '@/lib/adminAuth';
import { collection, onSnapshot, doc, updateDoc, getDoc, increment, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Modal } from '@/components/ui/Modal';
import {
  Users,
  Crown,
  Star,
  UserX,
  Search,
  Shield,
  Copy,
  Check,
  Share2,
  AlertCircle
} from 'lucide-react';

interface BatchMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchMembersModal: React.FC<BatchMembersModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useUser();
  const { profile, showToast } = useApp();

  const [members, setMembers] = useState<any[]>([]);
  const [batchData, setBatchData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);

  const batchKey = profile.batchKey;
  const userEmail = user?.primaryEmailAddress?.emailAddress || profile.email || '';
  const isSuperAdmin = isUserSuperAdmin(profile, userEmail);

  // 1. Fetch & Listen to Batch Details
  useEffect(() => {
    if (!batchKey || !isOpen) return;

    const batchDocRef = doc(db, 'shared_timetables', batchKey);
    const unsubscribe = onSnapshot(batchDocRef, (snap) => {
      if (snap.exists()) {
        setBatchData(snap.data());
      }
    }, (err) => console.error('Batch doc error:', err));

    return () => unsubscribe();
  }, [batchKey, isOpen]);

  // 2. Fetch & Listen to All Members joined to this batch
  useEffect(() => {
    if (!batchKey || !isOpen) return;

    setLoading(true);
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('profile.batchKey', '==', batchKey),
        where('profile.isBatchSynced', '==', true)
      );

      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const fetched: any[] = [];
        snapshot.forEach((d) => {
          fetched.push({ id: d.id, ...d.data() });
        });
        setMembers(fetched);
        setLoading(false);
      }, (err) => {
        console.error('Error fetching batch members:', err);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [batchKey, isOpen]);

  if (!batchKey) return null;

  // Check if current user is a CR for this batch
  const isLegacyBatch = !batchData?.crUserIds && !batchData?.crEmails;
  const isPrimaryCreator = isLegacyBatch && (batchData?.creatorId === user?.id || (batchData?.creatorEmail && batchData?.creatorEmail === userEmail));
  const isCoCR = batchData?.crUserIds?.includes(user?.id) || batchData?.crEmails?.includes(userEmail) || profile.role === 'cr';
  const isAuthorizedCR = isSuperAdmin || isPrimaryCreator || isCoCR;

  // Handler: Make or Remove CR
  const handleToggleCR = async (memberId: string, memberEmail: string, currentIsCR: boolean) => {
    if (!isAuthorizedCR) {
      showToast('Unauthorized', 'Only the Class Representative can manage roles.', 'error');
      return;
    }

    try {
      const batchDocRef = doc(db, 'shared_timetables', batchKey);
      const userDocRef = doc(db, 'users', memberId);

      if (currentIsCR) {
        // Demote to student — but make sure at least one other CR remains
        const otherCRs = (batchData?.crUserIds || []).filter((id: string) => id !== memberId);
        const otherCREmails = (batchData?.crEmails || []).filter((e: string) => e !== memberEmail);
        const primaryRemains = isLegacyBatch && batchData?.creatorId && batchData?.creatorId !== memberId;
        if (!primaryRemains && otherCRs.length === 0 && otherCREmails.length === 0) {
          showToast('Cannot Demote', 'Batch must have at least one CR. Promote another student first.', 'error');
          return;
        }
        await updateDoc(batchDocRef, {
          crUserIds: arrayRemove(memberId),
          crEmails: arrayRemove(memberEmail),
        });
        await updateDoc(userDocRef, { 'profile.role': 'student' });
        showToast('Role Updated', 'Student demoted from CR role.', 'info');
      } else {
        // Promote to CR
        await updateDoc(batchDocRef, {
          crUserIds: arrayUnion(memberId),
          crEmails: arrayUnion(memberEmail),
        });
        await updateDoc(userDocRef, { 'profile.role': 'cr' });
        showToast('CR Promoted', 'Student has been made a Class Representative (CR)!', 'success');
      }
    } catch (e) {
      console.error('Error updating CR role:', e);
      showToast('Error', 'Failed to update member role.', 'error');
    }
  };

  // Handler: CR voluntarily gives up their own CR position (only if another CR exists)
  const handleWithdrawSelfAsCR = async () => {
    const otherCRs = (batchData?.crUserIds || []).filter((id: string) => id !== user?.id);
    const otherCREmails = (batchData?.crEmails || []).filter((e: string) => e !== userEmail);
    const primaryRemains = isLegacyBatch && batchData?.creatorId && batchData?.creatorId !== user?.id;

    if (!primaryRemains && otherCRs.length === 0 && otherCREmails.length === 0) {
      showToast(
        'Cannot Withdraw',
        'You are the only CR! Promote another student to CR first before withdrawing.',
        'error'
      );
      return;
    }

    if (!window.confirm('Are you sure you want to give up your CR role? Another CR must already exist.')) return;

    try {
      const batchDocRef = doc(db, 'shared_timetables', batchKey);
      const userDocRef = user?.id ? doc(db, 'users', user.id) : null;

      await updateDoc(batchDocRef, {
        crUserIds: arrayRemove(user?.id),
        crEmails: arrayRemove(userEmail),
      });
      if (userDocRef) {
        await updateDoc(userDocRef, { 'profile.role': 'student' });
      }
      showToast('CR Role Withdrawn', 'You have stepped down as CR. Another CR is still active.', 'info');
    } catch (e) {
      console.error('Error withdrawing CR:', e);
      showToast('Error', 'Failed to withdraw CR role.', 'error');
    }
  };

  // Handler: Remove / Kick Unauthorized Person from Batch
  const handleRemoveMember = async (memberId: string, memberName: string, memberEmail: string) => {
    if (!isAuthorizedCR) {
      showToast('Unauthorized', 'Only the Class Representative can remove students.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove "${memberName || memberEmail}" from this batch? They will be disconnected from all batch schedules.`)) {
      return;
    }

    try {
      const userDocRef = doc(db, 'users', memberId);
      const batchDocRef = doc(db, 'shared_timetables', batchKey);

      // Disconnect user from batch
      await updateDoc(userDocRef, {
        'profile.isBatchSynced': false,
        'profile.batchKey': null,
        'profile.role': 'student',
      });

      // Update batch metadata
      await updateDoc(batchDocRef, {
        studentCount: increment(-1),
        crUserIds: arrayRemove(memberId),
        crEmails: arrayRemove(memberEmail),
      });

      showToast('Member Removed', `${memberName || 'User'} has been removed from this batch.`, 'info');
    } catch (e) {
      console.error('Error removing member:', e);
      showToast('Error', 'Failed to remove member.', 'error');
    }
  };

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/?invite=${batchKey}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    showToast('Link Copied', 'Master batch invite link copied to clipboard.', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    const p = m.profile || {};
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.rollNumber || '').toLowerCase().includes(q)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Batch Members"
      description=""
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-3 text-left">

        {/* Batch Info Header */}
        <div className="border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black p-3 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-black uppercase tracking-widest truncate">
              {profile.programme} · {profile.branch} · Sem {profile.semester}
            </span>
            <span className="text-[10px] font-mono opacity-60 truncate">
              {profile.college}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold bg-white/20 dark:bg-black/20 px-2 py-0.5">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleCopyInvite}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black dark:bg-black dark:text-white text-[10px] font-black uppercase tracking-wider hover:opacity-80 transition-opacity cursor-pointer"
            >
              {copiedLink ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
              <span>{copiedLink ? 'Copied!' : 'Invite Link'}</span>
            </button>
          </div>
        </div>

        {/* CR Banner */}
        {isAuthorizedCR ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2 border border-amber-400 bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 leading-tight">
                👑 You are the CR — manage roles & members below.
              </span>
            </div>
            {!isPrimaryCreator && (
              <button
                onClick={handleWithdrawSelfAsCR}
                className="shrink-0 px-2 py-0.5 border border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white text-[9px] font-bold uppercase transition-colors cursor-pointer"
              >
                Step Down
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 border border-black/10 dark:border-white/10 bg-black/3 dark:bg-white/3">
            <Shield className="w-3.5 h-3.5 shrink-0 text-black/40 dark:text-white/40" />
            <span className="text-[11px] text-black/50 dark:text-white/50">Viewing as batch member</span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30" />
          <input
            type="text"
            placeholder="Search by name, email or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-black/20 dark:border-white/20 bg-transparent text-xs font-mono focus:outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-black/30 dark:placeholder:text-white/30"
          />
        </div>

        {/* Members List */}
        <div className="border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5 max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-[11px] font-mono text-black/30 dark:text-white/30 animate-pulse">
              Loading members...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-10 text-center text-[11px] text-black/40 dark:text-white/40">
              No members found.
            </div>
          ) : (
            filteredMembers.map((m) => {
              const p = m.profile || {};
              const memberName = p.name || 'Student';
              const memberEmail = p.email || '';
              const memberRoll = p.rollNumber;

              const isMemberCreator = isLegacyBatch && (batchData?.creatorId === m.id || (batchData?.creatorEmail && batchData?.creatorEmail === memberEmail));
              const isMemberCR = isMemberCreator || batchData?.crUserIds?.includes(m.id) || batchData?.crEmails?.includes(memberEmail) || p.role === 'cr';
              const isCurrentUser = m.id === user?.id || (memberEmail && memberEmail === userEmail);

              return (
                <div
                  key={m.id}
                  className={`px-3 py-2.5 flex items-center gap-3 transition-colors ${isCurrentUser ? 'bg-black/[0.02] dark:bg-white/[0.02]' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 shrink-0 flex items-center justify-center text-xs font-black border ${
                    isMemberCreator 
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                      : isMemberCR 
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                        : 'border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 text-black dark:text-white'
                  }`}>
                    {isMemberCreator ? <Crown className="w-3.5 h-3.5" /> : isMemberCR ? <Star className="w-3.5 h-3.5" /> : memberName.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-black dark:text-white truncate max-w-[140px]">
                        {memberName}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[9px] font-mono border border-black/20 dark:border-white/20 px-1 text-black/50 dark:text-white/50 uppercase">you</span>
                      )}
                      {isMemberCreator ? (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-px border border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-transparent">👑 CR</span>
                      ) : isMemberCR ? (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-px border border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-transparent">⭐ Co-CR</span>
                      ) : null}
                    </div>
                    <div className="text-[10px] font-mono text-black/40 dark:text-white/40 truncate mt-0.5">
                      {memberEmail || m.id?.slice(0, 20)}
                      {memberRoll && <span className="ml-2 text-black/30 dark:text-white/30">#{memberRoll}</span>}
                    </div>
                  </div>

                  {/* Actions — CR only, not current user, not primary creator */}
                  {isAuthorizedCR && !isCurrentUser && !isMemberCreator && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleCR(m.id, memberEmail, isMemberCR)}
                        className={`px-2 py-1 text-[9px] font-black uppercase border transition-colors cursor-pointer ${
                          isMemberCR
                            ? 'border-black/20 dark:border-white/20 text-black/50 dark:text-white/50 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                            : 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black hover:opacity-75'
                        }`}
                        title={isMemberCR ? 'Remove CR role' : 'Make Class Representative'}
                      >
                        {isMemberCR ? 'Demote' : 'Make CR'}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(m.id, memberName, memberEmail)}
                        className="p-1.5 border border-rose-300 dark:border-rose-700 text-rose-500 dark:text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors cursor-pointer"
                        title="Remove from batch"
                      >
                        <UserX className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </Modal>
  );
};
