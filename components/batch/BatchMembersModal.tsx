'use client';

import { shareLink } from '@/lib/shareUtils';

import React, { useState, useEffect } from 'react';
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

  if (!batchKey) return null;

  const isLegacyBatch = !batchData?.crUserIds && !batchData?.crEmails;
  const isPrimaryCreator = isLegacyBatch && (batchData?.creatorId === user?.id || (batchData?.creatorEmail && batchData?.creatorEmail === userEmail));
  const isCoCR = batchData?.crUserIds?.includes(user?.id) || batchData?.crEmails?.includes(userEmail) || profile.role === 'cr';
  const isAuthorizedCR = isSuperAdmin || isPrimaryCreator || isCoCR;

  const checkMemberIsCR = (m: any) => {
    const memberEmail = m.profile?.email || '';
    const isCreator = isLegacyBatch && (batchData?.creatorId === m.id || (batchData?.creatorEmail && batchData?.creatorEmail === memberEmail));
    return isCreator || batchData?.crUserIds?.includes(m.id) || batchData?.crEmails?.includes(memberEmail) || m.profile?.role === 'cr';
  };

  const checkMemberIsCreator = (m: any) => {
    const memberEmail = m.profile?.email || '';
    return isLegacyBatch && (batchData?.creatorId === m.id || (batchData?.creatorEmail && batchData?.creatorEmail === memberEmail));
  };

  const checkIsCurrentUser = (m: any) => {
    const memberEmail = m.profile?.email || '';
    return m.id === user?.id || (memberEmail && memberEmail === userEmail);
  };

  const handleToggleCR = async (memberId: string, memberEmail: string, currentIsCR: boolean) => {
    if (!isAuthorizedCR) {
      showToast('Unauthorized', 'Only the Class Representative can manage roles.', 'error');
      return;
    }
    try {
      const batchDocRef = doc(db, 'shared_timetables', batchKey);
      const userDocRef = doc(db, 'users', memberId);
      if (currentIsCR) {
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

    try {
      const batchDocRef = doc(db, 'shared_timetables', batchKey);
      const userDocRef = doc(db, 'users', user?.id || '');

      await updateDoc(batchDocRef, {
        crUserIds: arrayRemove(user?.id || ''),
        crEmails: arrayRemove(userEmail),
      });
      await updateDoc(userDocRef, { 'profile.role': 'student' });
      showToast('CR Role Given Up', 'You have successfully stepped down from the CR role.', 'info');
    } catch (e) {
      console.error('Error withdrawing CR role:', e);
      showToast('Error', 'Failed to update your role.', 'error');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string, memberEmail: string) => {
    if (!isAuthorizedCR) {
      showToast('Unauthorized', 'Only the Class Representative can remove members.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this batch?`)) {
      return;
    }
    try {
      const userDocRef = doc(db, 'users', memberId);
      await updateDoc(userDocRef, {
        'profile.isBatchSynced': false,
        'profile.batchKey': null,
        'profile.role': 'student'
      });
      const batchDocRef = doc(db, 'shared_timetables', batchKey);
      await updateDoc(batchDocRef, {
        memberCount: increment(-1),
        crUserIds: arrayRemove(memberId),
        crEmails: arrayRemove(memberEmail)
      });
      showToast('Member Removed', `${memberName} has been removed from the batch.`, 'success');
    } catch (e) {
      console.error('Error removing member:', e);
      showToast('Error', 'Failed to remove member.', 'error');
    }
  };

  const handleCopyInvite = async () => {
    const batchTitle = `${batchData?.branch || profile.branch || 'Class'} - Sec ${batchData?.section || profile.section || 'A'} (Sem ${batchData?.semester || profile.semester || ''})`;
    const code = batchData?.inviteCode || batchKey;
    const inviteUrl = `${window.location.origin}/?invite=${code}`;
    const shareText = `🔥 *Join our official ${batchTitle} Timetable on Intersemester!*

⚡ Realtime Class Cancellation & Reschedule Alerts
📊 75% Attendance Tracker & Bunk Calculator
📅 Live Exam Schedule, Room Numbers & Lab Sessions

👉 Tap link to sync your schedule in 1-tap:`;

    const res = await shareLink({
      title: `Join ${batchTitle} Schedule`,
      text: shareText,
      url: inviteUrl,
      dialogTitle: 'Invite Batchmates via',
    });
    if (res === 'copied') {
      setCopiedLink(true);
      showToast('Link Copied', 'Batch invite link copied to clipboard.', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    }
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

  const crMembers = members.filter((m) => checkMemberIsCR(m));
  const normalMembers = filteredMembers.filter((m) => !checkMemberIsCR(m));

  let displayYear = batchData?.year;
  if (!displayYear && batchData?.semester) {
    const semNum = Number(String(batchData.semester).replace(/[^0-9]/g, ''));
    if (!isNaN(semNum) && semNum > 0) {
      displayYear = Math.ceil(semNum / 2);
    }
  }
  displayYear = displayYear || '?';

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
              <span className="text-[11px] font-semibold text-[#6F6F6F] uppercase mt-[4px]">
                YEAR {displayYear} · {members.length} MEMBERS
              </span>
            </div>

            {/* Invite Button */}
            <button 
              onClick={handleCopyInvite}
              className="flex items-center justify-between py-4 border-y border-[#D9D9D6] dark:border-[#333333] hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left group"
            >
              <span className="text-[12px] font-bold tracking-[1px] text-[#111111] dark:text-[#FFFFFF] uppercase">
                {copiedLink ? 'INVITE LINK COPIED' : 'INVITE MEMBERS'}
              </span>
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <ArrowRight className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF]" />}
            </button>

            {/* CR Section */}
            {crMembers.length > 0 && (
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase mb-4">CLASS REPRESENTATIVE</span>
                <div className="flex flex-col gap-3">
                  {crMembers.map((cr) => {
                    const p = cr.profile || {};
                    const isCurrentUser = checkIsCurrentUser(cr);
                    return (
                      <div key={cr.id} className="relative flex flex-col items-center justify-center p-6 border border-[#D9D9D6] dark:border-[#333333] text-center">
                        <div className="w-20 h-20 flex items-center justify-center mb-3">
                          <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${p.avatarUrl || cr.id}&backgroundColor=transparent`} alt="avatar" className="w-full h-full object-contain drop-shadow-sm" />
                        </div>
                        <span className="text-[15px] font-semibold text-[#111111] dark:text-[#FFFFFF] line-clamp-1 break-all w-full px-4">
                          {p.name || 'CR'}
                        </span>
                        <span className="text-[11px] text-[#6F6F6F] mt-1 break-all line-clamp-2 w-full px-4">
                          CR · {p.rollNumber || p.email}
                        </span>
                        {isCurrentUser && (
                          <span className="absolute top-3 left-3 text-[9px] font-bold tracking-widest text-[#6F6F6F] border border-[#D9D9D6] dark:border-[#333333] px-1.5 py-0.5 uppercase">YOU</span>
                        )}
                        <button 
                          onClick={() => setSelectedMember(cr)}
                          className="absolute top-3 right-3 p-1.5 text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
                         handleToggleCR(selectedMember.id, selectedMember.profile?.email || '', checkMemberIsCR(selectedMember)); 
                         setSelectedMember(null); 
                       }} 
                       className="text-left py-3 text-[14px] font-semibold text-[#111111] dark:text-[#FFFFFF] hover:opacity-70 transition-opacity"
                     >
                       {checkMemberIsCR(selectedMember) ? 'Demote from CR' : 'Make CR'}
                     </button>
                   </div>
                   
                   <div className="flex flex-col gap-1 border-t border-[#D9D9D6] dark:border-[#333333] pt-4 mt-2">
                     <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase mb-1">DANGER ZONE</span>
                     <button 
                       onClick={() => { 
                         handleRemoveMember(selectedMember.id, selectedMember.profile?.name || 'Student', selectedMember.profile?.email || ''); 
                         setSelectedMember(null); 
                       }} 
                       className="text-left py-3 text-[14px] font-semibold text-red-600 hover:opacity-70 transition-opacity"
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
