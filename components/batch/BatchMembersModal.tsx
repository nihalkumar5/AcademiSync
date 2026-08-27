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
  const isPrimaryCreator = batchData?.creatorId === user?.id || (batchData?.creatorEmail && batchData?.creatorEmail === userEmail);
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
        // Demote to student
        await updateDoc(batchDocRef, {
          crUserIds: arrayRemove(memberId),
          crEmails: arrayRemove(memberEmail),
        });
        await updateDoc(userDocRef, {
          'profile.role': 'student',
        });
        showToast('Role Updated', 'Student demoted from CR role.', 'info');
      } else {
        // Promote to CR
        await updateDoc(batchDocRef, {
          crUserIds: arrayUnion(memberId),
          crEmails: arrayUnion(memberEmail),
        });
        await updateDoc(userDocRef, {
          'profile.role': 'cr',
        });
        showToast('CR Promoted', 'Student has been made a Class Representative (CR)!', 'success');
      }
    } catch (e) {
      console.error('Error updating CR role:', e);
      showToast('Error', 'Failed to update member role.', 'error');
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
      title="Batch Members & CR Controls"
      description={`Manage joined students, elevate CR representatives, or remove unauthorized users for ${profile.college || 'your batch'}.`}
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-4 mt-2 text-left">
        {/* Batch Info & Share Header */}
        <div className="p-4 border border-black dark:border-white bg-black/5 dark:bg-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="font-bold text-xs uppercase tracking-wider">
                {profile.programme} {profile.branch} (Semester {profile.semester})
              </span>
            </div>
            <div className="text-[11px] font-mono text-black/60 dark:text-white/60 mt-0.5">
              Batch Code: <span className="font-bold">{batchKey}</span> • {members.length} Synced Student{members.length === 1 ? '' : 's'}
            </div>
          </div>

          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider border border-black dark:border-white hover:opacity-90 transition-opacity cursor-pointer shrink-0"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied Link' : 'Copy Invite Link'}</span>
          </button>
        </div>

        {/* CR Status Notice */}
        {isAuthorizedCR ? (
          <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-medium">
            <Crown className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>CR Access Active:</strong> You have permissions to promote other students to CR or remove unauthorized users from this batch.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-black/60 dark:text-white/60">
            <Shield className="w-4 h-4 shrink-0" />
            <span>You are viewing the batch student directory as a verified batch member.</span>
          </div>
        )}

        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
          <input
            type="text"
            placeholder="Search batch members by name, roll no, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-black dark:border-white bg-transparent text-xs font-mono focus:outline-none"
          />
        </div>

        {/* Members List */}
        <div className="max-h-[380px] overflow-y-auto border border-black dark:border-white divide-y divide-black/10 dark:divide-white/10">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-black/50 dark:text-white/50 animate-pulse">
              LOADING BATCH DIRECTORY...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-black/50 dark:text-white/50">
              No synced students found matching "{searchQuery}".
            </div>
          ) : (
            filteredMembers.map((m) => {
              const p = m.profile || {};
              const memberName = p.name || 'Student';
              const memberEmail = p.email || m.id;
              const memberRoll = p.rollNumber || '—';

              const isMemberCreator = batchData?.creatorId === m.id || (batchData?.creatorEmail && batchData?.creatorEmail === memberEmail);
              const isMemberCR = isMemberCreator || batchData?.crUserIds?.includes(m.id) || batchData?.crEmails?.includes(memberEmail) || p.role === 'cr';
              const isCurrentUser = m.id === user?.id || memberEmail === userEmail;

              return (
                <div
                  key={m.id}
                  className="p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 bg-black/5 dark:bg-white/5">
                      {isMemberCreator ? (
                        <Crown className="w-4 h-4 text-amber-500" />
                      ) : isMemberCR ? (
                        <Star className="w-4 h-4 text-amber-500" />
                      ) : (
                        memberName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-black dark:text-white truncate">
                          {memberName}
                        </span>

                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 border border-black/20 dark:border-white/20 text-[9px] font-mono uppercase">
                            You
                          </span>
                        )}

                        {isMemberCreator ? (
                          <span className="px-1.5 py-0.5 border border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[9px] font-bold uppercase tracking-wider">
                            👑 Primary CR
                          </span>
                        ) : isMemberCR ? (
                          <span className="px-1.5 py-0.5 border border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10 text-[9px] font-bold uppercase tracking-wider">
                            ⭐ Co-CR
                          </span>
                        ) : null}
                      </div>

                      <div className="text-[11px] font-mono text-black/60 dark:text-white/60 truncate">
                        {memberEmail} {memberRoll !== '—' ? `• Roll: ${memberRoll}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Actions for CR */}
                  {isAuthorizedCR && !isCurrentUser && (
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {/* Make / Remove CR Button (Only if not Primary Creator) */}
                      {!isMemberCreator && (
                        <button
                          onClick={() => handleToggleCR(m.id, memberEmail, isMemberCR)}
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                            isMemberCR
                              ? 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white text-black/60 dark:text-white/60'
                              : 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black hover:opacity-90'
                          }`}
                          title={isMemberCR ? 'Demote from CR' : 'Promote to Class Representative'}
                        >
                          {isMemberCR ? 'Demote CR' : '⭐ Make CR'}
                        </button>
                      )}

                      {/* Remove from Batch Button */}
                      {!isMemberCreator && (
                        <button
                          onClick={() => handleRemoveMember(m.id, memberName, memberEmail)}
                          className="flex items-center gap-1 px-2.5 py-1 border border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          title="Remove from this batch"
                        >
                          <UserX className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
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
