'use client';

import { shareLink, PLAY_STORE_URL } from '@/lib/shareUtils';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { isUserSuperAdmin, SUPER_ADMIN_EMAILS } from '@/lib/adminAuth';
import { normalizeIdList, isValidProperEmail } from '@/lib/timetableUtils';
import { onSnapshot, doc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuthHeaders } from '@/lib/authHeaders';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Crown, Search, Check, Share2, MoreVertical, Users, UserMinus } from '@/components/ui/icons';
import { getAvatarSrc, getAvatarSeed } from '@/lib/avatar';

interface BatchMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinBatch?: () => void;
}

// ── Robust Deduplication & Sanitization Engine ─────────────────────────────
// Filters phantom/anonymous ghost accounts, validates emails, and deduplicates
// duplicate logins by the SAME person based on UID, Roll Number, or verified Email.
// Students with the same name but different roll numbers or emails are preserved as distinct students.
export function deduplicateBatchMembers(rawList: any[], currentUserId?: string, currentUserEmail?: string): any[] {
  if (!Array.isArray(rawList)) return [];
  // 1. Keep all registered batch members, only filtering out malformed records or joke/fake emails
  const validList = rawList.filter((raw) => {
    if (!raw || !raw.id) return false;
    const p = raw.profile || {};
    const rawEmail = (p.email || '').trim().toLowerCase();

    // Only filter out if an email IS provided but it is an obvious joke/fake test domain (e.g. woh.pyaar.hai...)
    if (rawEmail && !isValidProperEmail(rawEmail)) {
      return false;
    }

    return true;
  });

  const mergedList: any[] = [];

  for (const raw of validList) {
    const rawP = raw.profile || {};
    const rawRoll = (rawP.rollNumber || '').trim().toLowerCase();
    const rawEmail = (rawP.email || '').trim().toLowerCase();
    const isRawRollValid = rawRoll.length >= 2 && rawRoll !== 'n/a';

    // Find if there's already an entry for this exact same person in mergedList
    const existingIndex = mergedList.findIndex((item) => {
      const itemP = item.profile || {};
      const itemRoll = (itemP.rollNumber || '').trim().toLowerCase();
      const itemEmail = (itemP.email || '').trim().toLowerCase();
      const isItemRollValid = itemRoll.length >= 2 && itemRoll !== 'n/a';

      // 1. Direct UID match (same user account)
      if (item.id === raw.id || item.allIds?.includes(raw.id)) return true;

      // 2. Current logged-in user match (both records belong to the active user)
      const rawIsCurrent = (currentUserId && raw.id === currentUserId) || 
                           (currentUserEmail && rawEmail && rawEmail === currentUserEmail.toLowerCase());
      const itemIsCurrent = (currentUserId && item.id === currentUserId) || 
                            (currentUserEmail && itemEmail && itemEmail === currentUserEmail.toLowerCase());
      if (rawIsCurrent && itemIsCurrent) return true;

      // Deduplicate admin accounts so Super Admin never has multiple duplicate cards
      const rawIsAdmin = SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === rawEmail);
      const itemIsAdmin = SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === itemEmail);
      if (rawIsAdmin && itemIsAdmin) return true;

      // CRITICAL CHECK: If both have valid DIFFERENT roll numbers, they are DEFINITELY two different students in the class!
      if (isRawRollValid && isItemRollValid && rawRoll !== itemRoll) {
        return false;
      }

      // CRITICAL CHECK: If both have valid DIFFERENT emails, they are DEFINITELY two different students!
      if (rawEmail && itemEmail && rawEmail !== itemEmail) {
        return false;
      }

      // 3. Exact Roll Number match (same roll number in the same batch means duplicate login by same student)
      if (isRawRollValid && isItemRollValid && rawRoll === itemRoll) return true;

      // 4. Exact Email match (same verified email means duplicate login by same student)
      if (rawEmail && itemEmail && rawEmail === itemEmail) return true;

      return false;
    });

    if (existingIndex >= 0) {
      const target = mergedList[existingIndex];
      const targetP = target.profile || {};
      const isTargetGeneric = !targetP.name || targetP.name.toLowerCase() === 'student' || targetP.name.toLowerCase() === 'student name';
      const isRawGeneric = !rawP.name || rawP.name.toLowerCase() === 'student' || rawP.name.toLowerCase() === 'student name';

      // Pick the cleanest name & roll number
      const chosenName = !isTargetGeneric ? targetP.name : (!isRawGeneric ? rawP.name : 'Student');
      const chosenRoll = targetP.rollNumber || rawP.rollNumber || '';
      const chosenEmail = targetP.email && isValidProperEmail(targetP.email) ? targetP.email : (rawP.email || '');
      const chosenAvatar = targetP.avatarUrl || rawP.avatarUrl;
      const isSuper = targetP.role === 'super_admin' || rawP.role === 'super_admin' || 
                      isUserSuperAdmin(targetP, targetP.email) || isUserSuperAdmin(rawP, rawP.email) ||
                      isUserSuperAdmin(null, chosenEmail);
      const isCR = !isSuper && (targetP.role === 'cr' || rawP.role === 'cr');

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
        role: isSuper ? 'super_admin' : (isCR ? 'cr' : (targetP.role || rawP.role || 'student')),
      };
      target.lastUpdated = Math.max(target.lastUpdated || 0, raw.lastUpdated || 0);
    } else {
      const isSuper = rawP.role === 'super_admin' || isUserSuperAdmin(rawP, rawP.email);
      mergedList.push({
        ...raw,
        allIds: [raw.id],
        allEmails: rawP.email ? [rawP.email] : [],
        profile: {
          ...rawP,
          role: isSuper ? 'super_admin' : (rawP.role || 'student'),
        },
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
  const [memberToRemove, setMemberToRemove] = useState<any | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

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

    let cancelled = false;
    setLoading(true);

    // Classmates' public profile fields come from the server; users docs are owner-only in Firestore rules
    (async () => {
      try {
        const res = await fetch(`/api/batch/members?batchKey=${encodeURIComponent(batchKey)}`, {
          headers: await getAuthHeaders({}),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && Array.isArray(data.members)) {
          setMembers(data.members);
        } else {
          console.error('Error fetching batch members:', data.error || res.status);
        }
      } catch (err) {
        if (!cancelled) console.error('Error fetching batch members:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [batchKey, isOpen]);

  const isLegacyBatch = !batchData?.crUserIds && !batchData?.crEmails;
  const isPrimaryCreator = isLegacyBatch && (batchData?.creatorId === user?.id || (batchData?.creatorEmail && batchData?.creatorEmail === userEmail));
  const isCoCR = (normalizeIdList(batchData?.crUserIds).includes(user?.id)) || 
                 (normalizeIdList(batchData?.crEmails).includes(userEmail)) || 
                 profile.role === 'cr';
  const isAuthorizedCR = isSuperAdmin || isPrimaryCreator || isCoCR;

  const checkMemberIsSuperAdmin = (m: any) => {
    if (!m) return false;
    const emails: string[] = (Array.isArray(m.allEmails) ? m.allEmails : [m.profile?.email || '']).map((e: string) => String(e || '').toLowerCase().trim());
    return emails.some((em) => isUserSuperAdmin(m.profile, em)) || m.profile?.role === 'super_admin';
  };

  const checkMemberIsCR = (m: any) => {
    if (!m) return false;
    // Super Admins are global platform authorities and are NEVER classified as Batch Pilots
    if (checkMemberIsSuperAdmin(m)) {
      return false;
    }

    const ids: string[] = Array.isArray(m.allIds) ? m.allIds : [m.id];
    const emails: string[] = (Array.isArray(m.allEmails) ? m.allEmails : [m.profile?.email || '']).map((e: string) => String(e || '').toLowerCase());

    const isCreator = isLegacyBatch && (
      ids.includes(batchData?.creatorId) || 
      (batchData?.creatorEmail && emails.includes(batchData.creatorEmail.toLowerCase()))
    );
    const inCRUserIds = normalizeIdList(batchData?.crUserIds).some((id: string) => ids.includes(id));
    const inCREmails = normalizeIdList(batchData?.crEmails).some((e: string) => emails.includes(String(e || '').toLowerCase()));

    return isCreator || inCRUserIds || inCREmails || m.profile?.role === 'cr';
  };

  const checkMemberIsCreator = (m: any) => {
    if (checkMemberIsSuperAdmin(m)) return false;
    const ids: string[] = Array.isArray(m.allIds) ? m.allIds : [m.id];
    const emails: string[] = (Array.isArray(m.allEmails) ? m.allEmails : [m.profile?.email || '']).map((e: string) => String(e || '').toLowerCase());
    return isLegacyBatch && (
      ids.includes(batchData?.creatorId) || 
      (batchData?.creatorEmail && emails.includes(batchData.creatorEmail.toLowerCase()))
    );
  };

  const checkIsCurrentUser = (m: any) => {
    const ids: string[] = Array.isArray(m.allIds) ? m.allIds : [m.id];
    const emails: string[] = (Array.isArray(m.allEmails) ? m.allEmails : [m.profile?.email || '']).map((e: string) => String(e || '').toLowerCase());
    return ids.includes(user?.id) || (userEmail && emails.includes(userEmail.toLowerCase()));
  };

  const handleToggleCR = async (member: any, currentIsCR: boolean) => {
    if (!batchKey) return;
    if (checkMemberIsSuperAdmin(member)) {
      showToast('Action Not Allowed', 'Super Admin role cannot be modified at the batch level.', 'error');
      return;
    }
    if (!isAuthorizedCR) {
      showToast('Unauthorized', 'Only a Batch Pilot can manage roles.', 'error');
      return;
    }
    const ids: string[] = member.allIds || [member.id];
    const emails: string[] = member.allEmails || [member.profile?.email || ''];
    const memberName = member.profile?.name || 'Student';
    const validIds = ids.filter(Boolean);
    const validEmails = emails.filter((e) => Boolean(e && e.trim()));

    try {
      const batchDocRef = doc(db, 'shared_timetables', batchKey);
      if (currentIsCR) {
        const otherCRs = normalizeIdList(batchData?.crUserIds).filter((id: string) => !ids.includes(id));
        const otherCREmails = normalizeIdList(batchData?.crEmails).filter((e: string) => !emails.includes(e));
        const primaryRemains = isLegacyBatch && batchData?.creatorId && !ids.includes(batchData?.creatorId);
        if (!primaryRemains && otherCRs.length === 0 && otherCREmails.length === 0) {
          showToast('Cannot Demote', 'Batch must have at least one Batch Pilot. Promote another student first.', 'error');
          return;
        }
        const updates: any = {};
        if (validIds.length > 0) updates.crUserIds = arrayRemove(...validIds);
        if (validEmails.length > 0) updates.crEmails = arrayRemove(...validEmails);
        if (Object.keys(updates).length > 0) {
          await updateDoc(batchDocRef, updates);
        }
        for (const id of validIds) {
          await updateDoc(doc(db, 'users', id), { 'profile.role': 'student' }).catch(() => {});
        }
        showToast('Role Updated', `${memberName} is no longer a Batch Pilot.`, 'info');
      } else {
        if (crMembers.length >= 3) {
          showToast(
            'Limit Reached',
            'A batch can have a maximum of 3 Batch Pilots. Demote one first to add another.',
            'error'
          );
          return;
        }
        const updates: any = {};
        if (validIds.length > 0) updates.crUserIds = arrayUnion(...validIds);
        if (validEmails.length > 0) updates.crEmails = arrayUnion(...validEmails);
        if (Object.keys(updates).length > 0) {
          await updateDoc(batchDocRef, updates);
        }
        for (const id of validIds) {
          await updateDoc(doc(db, 'users', id), { 'profile.role': 'cr' }).catch(() => {});
        }
        showToast('Batch Pilot Promoted! 🚀', `${memberName} is now a Batch Pilot!`, 'success');
      }
    } catch (e) {
      console.error('Error updating role:', e);
      showToast('Error', 'Failed to update member role.', 'error');
    }
  };

  const handleWithdrawSelfAsCR = async () => {
    if (!batchKey) return;
    if (isSuperAdmin) {
      showToast('Super Admin', 'You are a Super Admin, not a Batch Pilot.', 'info');
      return;
    }
    const otherCRs = normalizeIdList(batchData?.crUserIds).filter((id: string) => id !== user?.id);
    const otherCREmails = normalizeIdList(batchData?.crEmails).filter((e: string) => e !== userEmail);
    const primaryRemains = isLegacyBatch && batchData?.creatorId && batchData?.creatorId !== user?.id;

    if (!primaryRemains && otherCRs.length === 0 && otherCREmails.length === 0) {
      showToast(
        'Cannot Withdraw',
        'You are the only Batch Pilot! Promote another student to Batch Pilot first before stepping down.',
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
      showToast('Pilot Role Given Up', 'You have successfully stepped down as Batch Pilot.', 'info');
    } catch (e) {
      console.error('Error withdrawing Batch Pilot role:', e);
      showToast('Error', 'Failed to update your role.', 'error');
    }
  };

  const handleRemoveMember = (member: any) => {
    if (!batchKey) return;
    if (checkMemberIsSuperAdmin(member)) {
      showToast('Action Not Allowed', 'Super Admins cannot be removed from a batch.', 'error');
      return;
    }
    if (!isAuthorizedCR) {
      showToast('Unauthorized', 'Only the Class Representative can remove members.', 'error');
      return;
    }
    setMemberToRemove(member);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove || !batchKey) return;
    const memberName = memberToRemove.profile?.name || 'Student';
    const ids: string[] = memberToRemove.allIds || [memberToRemove.id];
    const emails: string[] = memberToRemove.allEmails || [memberToRemove.profile?.email || ''];

    const validIds = ids.filter(Boolean);
    const validEmails = emails.filter((e) => Boolean(e && e.trim()));

    setIsRemovingMember(true);
    try {
      for (const id of validIds) {
        await updateDoc(doc(db, 'users', id), {
          'profile.isBatchSynced': false,
          'profile.batchKey': null,
          'profile.role': 'student'
        }).catch(() => {});
      }
      const batchDocRef = doc(db, 'shared_timetables', batchKey);
      const updates: any = {
        memberCount: increment(-1),
      };
      if (validIds.length > 0) updates.crUserIds = arrayRemove(...validIds);
      if (validEmails.length > 0) updates.crEmails = arrayRemove(...validEmails);
      await updateDoc(batchDocRef, updates).catch(() => {});
      showToast('Member Removed', `${memberName} has been removed from the batch.`, 'success');
      setMemberToRemove(null);
    } catch (e) {
      console.error('Error removing member:', e);
      showToast('Error', 'Failed to remove member.', 'error');
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!batchKey) return;
    const batchTitle = `${batchData?.branch || profile.branch || 'Class'} (Sem ${batchData?.semester || profile.semester || ''})`;
    const code = batchData?.inviteCode || batchKey;
    const shareText = `🔥 *Join our official ${batchTitle} Timetable on Intersemester!*

🔑 *Batch Code:* ${code}

⚡ Realtime Class Cancellation & Reschedule Alerts
📅 Live Exam Schedule, Room Numbers & Lab Sessions

📲 *Download App on Play Store:*
${PLAY_STORE_URL}

👉 Open Intersemester App → Tap *Connect Batch* → Enter Code: *${code}*`;

    const res = await shareLink({
      title: `Join ${batchTitle} Schedule`,
      text: shareText,
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

  const byYouThenName = (a: any, b: any) => {
    const ya = checkIsCurrentUser(a) ? 0 : 1;
    const yb = checkIsCurrentUser(b) ? 0 : 1;
    if (ya !== yb) return ya - yb;
    return (a.profile?.name || '').localeCompare(b.profile?.name || '');
  };

  const allPilotCount = useMemo(() => {
    return deduplicatedMembers.filter((m) => checkMemberIsCR(m)).length;
  }, [deduplicatedMembers, batchData]);

  const crMembers = useMemo(() => {
    return filteredMembers.filter((m) => checkMemberIsCR(m)).sort(byYouThenName);
  }, [filteredMembers, batchData]);

  const normalMembers = useMemo(() => {
    return filteredMembers.filter((m) => !checkMemberIsCR(m)).sort(byYouThenName);
  }, [filteredMembers, batchData]);

  // Only open the action sheet when it has something to offer
  const hasActions = (m: any) =>
    !checkMemberIsSuperAdmin(m) &&
    ((isAuthorizedCR && !checkIsCurrentUser(m) && !checkMemberIsCreator(m)) ||
      (checkIsCurrentUser(m) && checkMemberIsCR(m) && !checkMemberIsCreator(m)));

  const inviteCode = batchData?.inviteCode || '';

  let displayYear = batchData?.year;
  if (!displayYear && batchData?.semester) {
    const semNum = Number(String(batchData.semester).replace(/[^0-9]/g, ''));
    if (!isNaN(semNum) && semNum > 0) {
      displayYear = Math.ceil(semNum / 2);
    }
  }
  displayYear = displayYear || '?';

  const MemberList = ({ members: list, pilot = false }: { members: any[]; pilot?: boolean }) => (
    <ul className="border border-line bg-surface divide-y divide-line-soft">
      {list.map((m) => {
        const p = m.profile || {};
        const isYou = checkIsCurrentUser(m);
        const actionable = hasActions(m);
        const content = (
          <>
            <span className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-[#F1F1EF] dark:bg-[#F4F4F6]">
              <img src={getAvatarSrc(getAvatarSeed({ avatarUrl: p.avatarUrl, id: m.id, role: p.role }))} alt="" className="w-full h-full object-cover scale-110 translate-y-0.5" loading="lazy" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-[15px] font-medium text-fg truncate">{p.name || 'Student'}</span>
                {isYou && (
                  <span className="shrink-0 text-[11px] font-semibold px-1.5 py-0.5 bg-ink text-on-ink">You</span>
                )}
              </span>
              <span className="block mt-0.5 text-[13px] text-muted truncate">
                {pilot ? 'Batch pilot · ' : ''}
                {p.rollNumber || p.email || '—'}
              </span>
            </span>
            {actionable && <MoreVertical className="w-4 h-4 shrink-0 text-faint" />}
          </>
        );
        return (
          <li key={m.id}>
            {actionable ? (
              <button
                type="button"
                onClick={() => setSelectedMember(m)}
                aria-label={`Options for ${p.name || 'member'}`}
                className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-surface-2 transition-colors"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );

  if (!isOpen || !batchKey) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} mobileFullSheet maxWidth="2xl" title="Batch Members">
        <div className="flex flex-col gap-6 font-sans">
          {/* Batch summary */}
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 shrink-0 flex items-center justify-center bg-ink text-on-ink">
              <Users className="w-5 h-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-[17px] font-semibold leading-snug text-fg break-words">
                {[batchData?.programme, batchData?.branch].filter(Boolean).join(' · ') || 'Your batch'}
              </p>
              <p className="mt-0.5 text-[13px] text-muted">
                Semester {batchData?.semester || '?'} · Year {displayYear} · {deduplicatedMembers.length}{' '}
                {deduplicatedMembers.length === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>

          {/* Invite */}
          <div className="border border-line bg-surface">
            {inviteCode && (
              <div className="flex items-center justify-between gap-3 px-4 pt-4">
                <div>
                  <p className="text-[13px] text-muted">Batch code</p>
                  <p className="mt-0.5 text-[22px] font-mono font-semibold tracking-[4px] text-fg select-all">{inviteCode}</p>
                </div>
              </div>
            )}
            <div className="p-4 flex gap-2">
              <button
                type="button"
                onClick={handleCopyInvite}
                className="btn btn-primary flex-1"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copiedLink ? 'Copied' : 'Invite batchmates'}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Search name, roll no. or email"
              aria-label="Search members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-10 pr-4 bg-surface text-[15px] text-fg border border-line focus:outline-none focus:border-line-strong transition-colors placeholder:text-[#8A8A8A] dark:placeholder:text-[#71717A]"
            />
          </div>

          {loading ? (
            <div className="border border-line divide-y divide-line-soft" aria-busy="true" aria-label="Loading members">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-10 h-10 rounded-full bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
                  <span className="flex-1">
                    <span className="block h-3.5 w-1/2 bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
                    <span className="block mt-2 h-3 w-1/3 bg-surface-2 animate-pulse" />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <>
              {crMembers.length > 0 && (
                <section className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-[17px] font-semibold text-fg flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" /> Batch pilots
                    </h4>
                    <span className="text-[13px] text-muted">{allPilotCount} of 3</span>
                  </div>
                  <MemberList members={crMembers} pilot />
                </section>
              )}

              <section className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-[17px] font-semibold text-fg">Members</h4>
                  <span className="text-[13px] text-muted">{normalMembers.length}</span>
                </div>
                {normalMembers.length === 0 ? (
                  <div className="border border-dashed border-line px-4 py-8 text-center text-[14px] text-muted">
                    {searchQuery ? `No one matches "${searchQuery}".` : 'No members yet. Share the code to invite your class.'}
                  </div>
                ) : (
                  <MemberList members={normalMembers} />
                )}
              </section>
            </>
          )}
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
            <div className="flex items-center gap-3 pb-4 mb-2 border-b border-line-soft">
              <span className="w-12 h-12 shrink-0 rounded-full overflow-hidden bg-[#F1F1EF] dark:bg-[#F4F4F6]">
                <img src={getAvatarSrc(getAvatarSeed({ avatarUrl: selectedMember.profile?.avatarUrl, id: selectedMember.id, role: selectedMember.profile?.role }))} alt="" className="w-full h-full object-cover scale-110 translate-y-0.5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[17px] font-semibold text-fg truncate">
                  {selectedMember.profile?.name || 'Student'}
                </h3>
                <p className="text-[13px] text-muted truncate">
                  {checkMemberIsCR(selectedMember) ? 'Batch pilot · ' : ''}
                  {selectedMember.profile?.rollNumber || selectedMember.profile?.email}
                </p>
              </div>
            </div>

            <div className="flex flex-col">
              {isAuthorizedCR && !checkIsCurrentUser(selectedMember) && !checkMemberIsCreator(selectedMember) && !checkMemberIsSuperAdmin(selectedMember) ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleCR(selectedMember, checkMemberIsCR(selectedMember));
                      setSelectedMember(null);
                    }}
                    className="flex items-center gap-3 h-14 text-left text-[15px] font-medium text-fg hover:opacity-70 transition-opacity cursor-pointer"
                  >
                    <Crown className="w-5 h-5 text-amber-500" />
                    {checkMemberIsCR(selectedMember) ? 'Remove as batch pilot' : 'Make batch pilot'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleRemoveMember(selectedMember);
                      setSelectedMember(null);
                    }}
                    className="flex items-center gap-3 h-14 text-left text-[15px] font-medium text-rose-600 dark:text-rose-400 border-t border-line-soft hover:opacity-70 transition-opacity cursor-pointer"
                  >
                    <UserMinus className="w-5 h-5" />
                    Remove from batch
                  </button>
                </>
              ) : checkIsCurrentUser(selectedMember) && checkMemberIsCR(selectedMember) && !checkMemberIsCreator(selectedMember) ? (
                <button
                  type="button"
                  onClick={() => {
                    handleWithdrawSelfAsCR();
                    setSelectedMember(null);
                  }}
                  className="flex items-center gap-3 h-14 text-left text-[15px] font-medium text-fg hover:opacity-70 transition-opacity cursor-pointer"
                >
                  <Crown className="w-5 h-5 text-amber-500" />
                  Step down as batch pilot
                </button>
              ) : (
                <p className="py-4 text-[14px] text-muted">No actions available for this member.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Remove Member Confirmation Modal */}
      <ConfirmModal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={confirmRemoveMember}
        title="Remove Member from Batch"
        description="Are you sure you want to remove this student from the shared batch? They will be unlinked from the shared timetable."
        highlightText={memberToRemove ? `${memberToRemove.profile?.name || 'Student'}${memberToRemove.profile?.rollNumber ? ` (${memberToRemove.profile.rollNumber})` : ''} — ${memberToRemove.profile?.email || 'No email'}` : undefined}
        confirmLabel="Remove Member"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isRemovingMember}
      />
    </>
  );
};
