'use client';

import { shareLink } from '@/lib/shareUtils';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { isUserSuperAdmin } from '@/lib/adminAuth';
import { collection, onSnapshot, doc, updateDoc, increment, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Modal } from '@/components/ui/Modal';
import { Crown, Search, Check, Share2, ArrowRight, MoreVertical, ChevronLeft } from 'lucide-react';

interface BatchMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinBatch?: () => void;
}

// ── Robust Deduplication Engine ──────────────────────────────────────────────
// Groups multiple Firestore documents belonging to the same real student
// based on: User ID, Roll Number, Email, or Full Name.
function deduplicateBatchMembers(rawList: any[], currentUserId?: string, currentUserEmail?: string): any[] {
  const mergedList: any[] = [];

  for (const raw of rawList) {
    const rawP = raw.profile || {};
    const rawRoll = (rawP.rollNumber || '').trim().toLowerCase();
    const rawEmail = (rawP.email || '').trim().toLowerCase();
    const rawName = (rawP.name || '').trim().toLowerCase();
    const isRawGeneric = !rawName || rawName === 'student' || rawName === 'student name';

    // Find if there's already an entry for this person in mergedList
    const existingIndex = mergedList.findIndex((item) => {
      const itemP = item.profile || {};
      const itemRoll = (itemP.rollNumber || '').trim().toLowerCase();
      const itemEmail = (itemP.email || '').trim().toLowerCase();
      const itemName = (itemP.name || '').trim().toLowerCase();
      const isItemGeneric = !itemName || itemName === 'student' || itemName === 'student name';

      // 1. Direct UID match
      if (item.id === raw.id || item.allIds?.includes(raw.id)) return true;

      // 2. Exact Roll Number match (if non-empty & valid length >= 3)
      if (rawRoll && itemRoll && rawRoll.length >= 3 && rawRoll === itemRoll) return true;

      // 3. Exact Email match (if non-empty)
      if (rawEmail && itemEmail && rawEmail === itemEmail) return true;

      // 4. Exact Full Name match (if both are non-generic e.g. "Tejasva Ukey", "Dayman Kumar", "Nihal Kumar")
      if (!isRawGeneric && !isItemGeneric && rawName === itemName) return true;

      // 5. Current logged-in user match
      const rawIsCurrent = raw.id === currentUserId || (rawEmail && rawEmail === currentUserEmail?.toLowerCase());
      const itemIsCurrent = item.id === currentUserId || (itemEmail && itemEmail === currentUserEmail?.toLowerCase());
      if (rawIsCurrent && itemIsCurrent) return true;

      return false;
    });

    if (existingIndex >= 0) {
      const target = mergedList[existingIndex];
      const targetP = target.profile || {};
      const isTargetGeneric = !targetP.name || targetP.name.toLowerCase() === 'student' || targetP.name.toLowerCase() === 'student name';

      // Prefer real name over generic "Student"
      const chosenName = !isTargetGeneric ? targetP.name : (!isRawGeneric ? rawP.name : 'Student');
      const chosenRoll = targetP.rollNumber || rawP.rollNumber || '';
      const chosenEmail = targetP.email || rawP.email || '';
      const chosenAvatar = targetP.avatarUrl || rawP.avatarUrl;
      const isCR = targetP.role === 'cr' || rawP.role === 'cr';

      // Keep primary ID as the current user's ID if one matches
      const primaryId = (raw.id === currentUserId) ? raw.id : target.id;

      target.id = primaryId;
      target.allIds = Array.from(new Set([...(target.allIds || [target.id]), raw.id]));
      target.allEmails = Array.from(new Set([...(target.allEmails || []), targetP.email, rawP.email].filter(Boolean)));
      target.profile = {
        ...targetP,
        ...rawP,
        name: chosenName,
        rollNumber: chosenRoll,
        email: chosenEmail,
        avatarUrl: chosenAvatar,
        role: isCR ? 'cr' : (targetP.role || rawP.role || 'student'),
      };
      target.lastUpdated = Math.max(target.lastUpdated || 0, raw.lastUpdated || 0);
    } else {
      mergedList.push({
        ...raw,
        allIds: [raw.id],
        allEmails: rawP.email ? [rawP.email] : [],
      });
    }
  }

  return mergedList;
}

export const BatchMembersModal: React.FC<BatchMembersModalProps> = ({
  isOpen,
  onClose,
  onJoinBatch
}) => {
  const { profile, showToast, user } = useApp();

  const [members, setMembers] = useState<any[]>([]);
  const [batchData, setBatchData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const batchKey = profile.batchKey;
  const userEmail = user?.primaryEmailAddress?.emailAddress || profile.email || '';
  const isSuperAdmin = isUserSuperAdmin(profile, userEmail);

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

  const isLegacyBatch = !batchData?.crUserIds && !batchData?.crEmails;
  const isPrimaryCreator = isLegacyBatch && (batchData?.creatorId === user?.id || (batchData?.creatorEmail && batchData?.creatorEmail === userEmail));
  const isCoCR = batchData?.crUserIds?.includes(user?.id) || batchData?.crEmails?.includes(userEmail) || profile.role === 'cr';
  const isAuthorizedCR = isSuperAdmin || isPrimaryCreator || isCoCR;

  const checkMemberIsCR = (m: any) => {
    const ids: string[] = m.allIds || [m.id];
    const emails: string[] = (m.allEmails || [m.profile?.email || '']).map((e: string) => e.toLowerCase());

    const isCreator = isLegacyBatch && (
      ids.includes(batchData?.creatorId) || 
      (batchData?.creatorEmail && emails.includes(batchData.creatorEmail.toLowerCase()))
    );
    const inCRUserIds = batchData?.crUserIds?.some((id: string) => ids.includes(id));
    const inCREmails = batchData?.crEmails?.some((e: string) => emails.includes(e.toLowerCase()));

    return isCreator || inCRUserIds || inCREmails || m.profile?.role === 'cr';
  };

  const checkMemberIsCreator = (m: any) => {
    const ids: string[] = m.allIds || [m.id];
    const emails: string[] = (m.allEmails || [m.profile?.email || '']).map((e: string) => e.toLowerCase());
    return isLegacyBatch && (
      ids.includes(batchData?.creatorId) || 
      (batchData?.creatorEmail && emails.includes(batchData.creatorEmail.toLowerCase()))
    );
  };

  const checkIsCurrentUser = (m: any) => {
    const ids: string[] = m.allIds || [m.id];
    const emails: string[] = (m.allEmails || [m.profile?.email || '']).map((e: string) => e.toLowerCase());
    return ids.includes(user?.id) || (userEmail && emails.includes(userEmail.toLowerCase()));
  };

  const handleToggleCR = async (member: any, currentIsCR: boolean) => {
    if (!batchKey) return;
    if (!isAuthorizedCR) {
      showToast('Unauthorized', 'Only the Class Representative can manage roles.', 'error');
      return;
    }
    const ids: string[] = member.allIds || [member.id];
    const emails: string[] = member.allEmails || [member.profile?.email || ''];
    const memberName = member.profile?.name || 'Student';

    try {
      const batchDocRef = doc(db, 'shared_timetables', batchKey);
      if (currentIsCR) {
        const otherCRs = (batchData?.crUserIds || []).filter((id: string) => !ids.includes(id));
        const otherCREmails = (batchData?.crEmails || []).filter((e: string) => !emails.includes(e));
        const primaryRemains = isLegacyBatch && batchData?.creatorId && !ids.includes(batchData?.creatorId);
        if (!primaryRemains && otherCRs.length === 0 && otherCREmails.length === 0) {
          showToast('Cannot Demote', 'Batch must have at least one CR. Promote another student first.', 'error');
          return;
        }
        await updateDoc(batchDocRef, {
          crUserIds: arrayRemove(...ids),
          crEmails: arrayRemove(...emails),
        });
        for (const id of ids) {
          await updateDoc(doc(db, 'users', id), { 'profile.role': 'student' }).catch(() => {});
        }
        showToast('Role Updated', `${memberName} demoted from CR role.`, 'info');
      } else {
        if (crMembers.length >= 3) {
          showToast(
            'CR Limit Reached',
            'A batch can have a maximum of 3 Class Representatives (CRs). Demote one first to add another.',
            'error'
          );
          return;
        }
        await updateDoc(batchDocRef, {
          crUserIds: arrayUnion(...ids),
          crEmails: arrayUnion(...emails),
        });
        for (const id of ids) {
          await updateDoc(doc(db, 'users', id), { 'profile.role': 'cr' }).catch(() => {});
        }
        showToast('CR Promoted', `${memberName} is now a Class Representative!`, 'success');
      }
    } catch (e) {
      console.error('Error updating CR role:', e);
      showToast('Error', 'Failed to update member role.', 'error');
    }
  };

  const handleWithdrawSelfAsCR = async () => {
    if (!batchKey) return;
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

    try {
      const batchDocRef = doc(db, 'shared_timetables', batchKey);
      await updateDoc(batchDocRef, {
        crUserIds: arrayRemove(user?.id || ''),
        crEmails: arrayRemove(userEmail),
      });
      if (user?.id) {
        await updateDoc(doc(db, 'users', user.id), { 'profile.role': 'student' });
      }
      showToast('CR Role Given Up', 'You have successfully stepped down from the CR role.', 'info');
    } catch (e) {
      console.error('Error withdrawing CR role:', e);
      showToast('Error', 'Failed to update your role.', 'error');
    }
  };

  const handleRemoveMember = async (member: any) => {
    if (!batchKey) return;
    if (!isAuthorizedCR) {
      showToast('Unauthorized', 'Only the Class Representative can remove members.', 'error');
      return;
    }
    const memberName = member.profile?.name || 'Student';
    const ids: string[] = member.allIds || [member.id];
    const emails: string[] = member.allEmails || [member.profile?.email || ''];

    if (!window.confirm(`Are you sure you want to remove ${memberName} from this batch?`)) {
      return;
    }
    try {
      for (const id of ids) {
        await updateDoc(doc(db, 'users', id), {
          'profile.isBatchSynced': false,
          'profile.batchKey': null,
          'profile.role': 'student'
        }).catch(() => {});
      }
      const batchDocRef = doc(db, 'shared_timetables', batchKey);
      await updateDoc(batchDocRef, {
        memberCount: increment(-1),
        crUserIds: arrayRemove(...ids),
        crEmails: arrayRemove(...emails)
      }).catch(() => {});
      showToast('Member Removed', `${memberName} has been removed from the batch.`, 'success');
    } catch (e) {
      console.error('Error removing member:', e);
      showToast('Error', 'Failed to remove member.', 'error');
    }
  };

  const handleCopyInvite = async () => {
    if (!batchKey) return;
    const batchTitle = `${batchData?.branch || profile.branch || 'Class'} - Sec ${batchData?.section || profile.section || 'A'} (Sem ${batchData?.semester || profile.semester || ''})`;
    const code = batchData?.inviteCode || batchKey;
    const inviteUrl = `https://academi-sync-chi.vercel.app/?invite=${code}`;
    const shareText = `🔥 *Join our official ${batchTitle} Timetable on Intersemester!*

🔑 *Batch Code:* ${code}

⚡ Realtime Class Cancellation & Reschedule Alerts
📅 Live Exam Schedule, Room Numbers & Lab Sessions

👉 Open Intersemester App → Tap *Connect Batch* → Enter Code: *${code}*`;

    const res = await shareLink({
      title: `Join ${batchTitle} Schedule`,
      text: shareText,
      url: inviteUrl,
      dialogTitle: 'Share Batch Code via',
    });
    if (res === 'copied') {
      setCopiedLink(true);
      showToast('Code Copied', `Batch code copied: ${code}`, 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const deduplicatedMembers = useMemo(() => {
    return deduplicateBatchMembers(members, user?.id, userEmail);
  }, [members, user?.id, userEmail]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return deduplicatedMembers;
    return deduplicatedMembers.filter((m) => {
      const p = m.profile || {};
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.rollNumber || '').toLowerCase().includes(q)
      );
    });
  }, [deduplicatedMembers, searchQuery]);

  const crMembers = useMemo(() => {
    return deduplicatedMembers.filter((m) => checkMemberIsCR(m));
  }, [deduplicatedMembers, batchData]);

  const normalMembers = useMemo(() => {
    return filteredMembers.filter((m) => !checkMemberIsCR(m));
  }, [filteredMembers, batchData]);

  let displayYear = batchData?.year;
  if (!displayYear && batchData?.semester) {
    const semNum = Number(String(batchData.semester).replace(/[^0-9]/g, ''));
    if (!isNaN(semNum) && semNum > 0) {
      displayYear = Math.ceil(semNum / 2);
    }
  }
  displayYear = displayYear || '?';

  if (!isOpen || !batchKey) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} mobileFullSheet title="Batch Members">
        <div className="flex flex-col min-h-full bg-[#FFFFFF] dark:bg-[#111111]">
          

          <div className="p-5 flex flex-col gap-6 overflow-y-auto">
            {/* Programme & Meta */}
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase">
                {batchData?.programme || 'PROGRAMME'} · {batchData?.branch || 'BRANCH'}
              </span>
              <div className="flex items-center gap-2 text-[12px] text-[#6F6F6F] mt-1">
                <span>SEMESTER {batchData?.semester || '?'}</span>
                <span>·</span>
                <span>YEAR {displayYear}</span>
                {batchData?.section && (
                  <>
                    <span>·</span>
                    <span>SECTION {batchData.section}</span>
                  </>
                )}
              </div>
            </div>

            {/* Invite Button */}
            <button 
              onClick={handleCopyInvite}
              className="flex items-center justify-between py-4 border-y border-[#D9D9D6] dark:border-[#333333] hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left group"
            >
              <span className="text-[12px] font-bold tracking-[1px] text-[#111111] dark:text-[#FFFFFF] uppercase">
                {copiedLink ? 'BATCH CODE COPIED' : 'SHARE BATCH CODE'}
              </span>
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <ArrowRight className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF]" />}
            </button>

            {/* CR Section */}
            {crMembers.length > 0 && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase">
                    CLASS REPRESENTATIVE{crMembers.length > 1 ? `S (${crMembers.length}/3)` : ' (1/3)'}
                  </span>
                </div>
                <div className={`grid ${crMembers.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  {crMembers.map((cr) => {
                    const p = cr.profile || {};
                    const isCurrentUser = checkIsCurrentUser(cr);
                    return (
                      <div key={cr.id} className="relative flex flex-col items-center justify-center p-5 border border-[#D9D9D6] dark:border-[#333333] text-center bg-[#FDFDFD] dark:bg-[#151515]">
                        <div className="w-16 h-16 flex items-center justify-center mb-2.5">
                          <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${p.avatarUrl || cr.id}&backgroundColor=transparent`} alt="avatar" className="w-full h-full object-contain drop-shadow-sm" />
                        </div>
                        <span className="text-[14px] font-semibold text-[#111111] dark:text-[#FFFFFF] line-clamp-1 break-all w-full px-2">
                          {p.name || 'CR'}
                        </span>
                        <span className="text-[11px] text-[#6F6F6F] mt-0.5 break-all line-clamp-2 w-full px-2">
                          CR · {p.rollNumber || p.email}
                        </span>
                        {isCurrentUser && (
                          <span className="absolute top-2.5 left-2.5 text-[9px] font-bold tracking-widest text-[#6F6F6F] border border-[#D9D9D6] dark:border-[#333333] px-1.5 py-0.5 uppercase">YOU</span>
                        )}
                        <button 
                          onClick={() => setSelectedMember(cr)}
                          className="absolute top-2.5 right-2.5 p-1.5 text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Members Section */}
            <div className="flex flex-col mt-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase">MEMBERS</span>
                <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F]">{normalMembers.length}</span>
              </div>

              {/* Flat Search Input */}
              <div className="relative mb-6">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#111111] dark:text-[#FFFFFF] text-[16px] leading-none mb-[2px]">⌕</span>
                <input 
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-6 py-2 bg-transparent text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none border-b border-[#D9D9D6] dark:border-[#333333] transition-colors placeholder:text-[#6F6F6F]"
                />
              </div>

              {loading ? (
                <div className="py-10 text-center text-[11px] font-mono text-[#6F6F6F] animate-pulse">
                  Loading members...
                </div>
              ) : normalMembers.length === 0 ? (
                <div className="py-10 text-center text-[11px] text-[#6F6F6F]">
                  No members found.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {normalMembers.map((m) => {
                    const p = m.profile || {};
                    const isCurrentUser = checkIsCurrentUser(m);
                    return (
                      <div 
                        key={m.id}
                        onClick={() => setSelectedMember(m)}
                        className="flex flex-col items-center text-center border border-[#D9D9D6] dark:border-[#333333] p-5 cursor-pointer hover:border-[#111111] dark:hover:border-[#FFFFFF] transition-colors relative bg-[#FFFFFF] dark:bg-[#111111]"
                      >
                        <div className="w-16 h-16 mx-auto flex items-center justify-center mb-4">
                          <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${p.avatarUrl || m.id}&backgroundColor=transparent`} alt="avatar" className="w-full h-full object-contain drop-shadow-sm" />
                        </div>
                        <span className="text-[13px] font-semibold text-[#111111] dark:text-[#FFFFFF] leading-tight line-clamp-1 break-all w-full px-1">
                          {p.name || 'Student'}
                        </span>
                        <span className="text-[11px] text-[#6F6F6F] mt-1 break-all line-clamp-2 w-full px-1">
                          {p.rollNumber || p.email}
                        </span>
                        {isCurrentUser && (
                          <span className="absolute top-2 right-2 text-[8px] font-bold tracking-widest text-[#6F6F6F] border border-[#D9D9D6] dark:border-[#333333] px-1 py-0.5 uppercase">YOU</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Safe spacing at bottom */}
            <div className="h-4" />
          </div>
        </div>
      </Modal>

      {/* Action Bottom Sheet for Selected Member */}
      <Modal 
        isOpen={!!selectedMember} 
        onClose={() => setSelectedMember(null)}
        mobileFullSheet={false}
      >
        {selectedMember && (
          <div className="-m-5 p-5">
            <div className="border-b border-[#D9D9D6] dark:border-[#333333] pb-4 mb-4">
              <h3 className="text-[18px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                {selectedMember.profile?.name || 'Student'}
              </h3>
              <p className="text-[13px] text-[#6F6F6F] mt-1">
                {selectedMember.profile?.rollNumber || selectedMember.profile?.email}
              </p>
            </div>
            
            <div className="flex flex-col">
              {isAuthorizedCR && !checkIsCurrentUser(selectedMember) && !checkMemberIsCreator(selectedMember) ? (
                 <>
                   <div className="flex flex-col gap-1 mb-2">
                     <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase mb-1">CR ROLE</span>
                     <button 
                       onClick={() => { 
                         handleToggleCR(selectedMember, checkMemberIsCR(selectedMember)); 
                         setSelectedMember(null); 
                       }} 
                       className="text-left py-3 text-[14px] font-semibold text-[#111111] dark:text-[#FFFFFF] hover:opacity-70 transition-opacity cursor-pointer"
                     >
                       {checkMemberIsCR(selectedMember) ? 'Demote from CR' : 'Make CR'}
                     </button>
                   </div>
                   
                   <div className="flex flex-col gap-1 border-t border-[#D9D9D6] dark:border-[#333333] pt-4 mt-2">
                     <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase mb-1">DANGER ZONE</span>
                     <button 
                       onClick={() => { 
                         handleRemoveMember(selectedMember); 
                         setSelectedMember(null); 
                       }} 
                       className="text-left py-3 text-[14px] font-semibold text-red-600 hover:opacity-70 transition-opacity cursor-pointer"
                     >
                       Remove from batch
                     </button>
                   </div>
                 </>
              ) : checkIsCurrentUser(selectedMember) && checkMemberIsCR(selectedMember) && !checkMemberIsCreator(selectedMember) ? (
                 <div className="flex flex-col gap-1 mb-2">
                   <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase mb-1">CR ROLE</span>
                   <button 
                     onClick={() => { 
                       handleWithdrawSelfAsCR(); 
                       setSelectedMember(null); 
                     }} 
                     className="text-left py-3 text-[14px] font-semibold text-[#111111] dark:text-[#FFFFFF] hover:opacity-70 transition-opacity"
                   >
                     Step down from CR
                   </button>
                 </div>
              ) : (
                <div className="py-4 text-[13px] text-[#6F6F6F]">
                  No administrative actions available for this member.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
