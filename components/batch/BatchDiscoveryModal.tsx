'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useApp } from '@/context/AppContext';
import { 
  POPULAR_INDIAN_COLLEGES, 
  STANDARD_PROGRAMMES, 
  STANDARD_BRANCHES, 
  STANDARD_SECTIONS, 
  searchColleges,
  searchCollegesAsync, 
  CollegeItem 
} from '@/lib/collegeDirectory';
import { getCanonicalBatchKey, isExplicitSection, formatBatchDisplayName, extractCleanInviteCode } from '@/lib/timetableUtils';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Sparkles, Users, CheckCircle2, ArrowRight, ShieldCheck, School, BookOpen, Layers, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CRApplicationModal } from '@/components/cr/CRApplicationModal';
import { BatchSetupPromptModal } from '@/components/batch/BatchSetupPromptModal';

interface BatchDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'directory' | 'code';
}

export const BatchDiscoveryModal: React.FC<BatchDiscoveryModalProps> = ({ isOpen, onClose, initialTab = 'directory' }) => {
  const { profile, joinBatchTimetable, showToast, user } = useApp();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'directory' | 'code'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  
  // Directory selections
  const [collegeSearch, setCollegeSearch] = useState(profile.college || '');
  const [selectedCollege, setSelectedCollege] = useState<string>(profile.college || '');
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [filteredColleges, setFilteredColleges] = useState<CollegeItem[]>([]);

  const [programme, setProgramme] = useState(profile.programme || 'B.Tech / B.E.');
  const [branch, setBranch] = useState(profile.branch || 'Computer Science & Engg (CSE)');
  const [semester, setSemester] = useState<number>(profile.semester || 4);
  const [section, setSection] = useState<string>(profile.section || 'A');

  // Live Batch Detection State
  const [isCheckingBatch, setIsCheckingBatch] = useState(false);
  const [foundBatch, setFoundBatch] = useState<any | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Invite code tab
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [showCRModal, setShowCRModal] = useState(false);
  const [showSetupPromptModal, setShowSetupPromptModal] = useState(false);

  const cleanSection = (secStr: string) => {
    if (!secStr || secStr.toLowerCase().includes('no section') || secStr.toLowerCase().includes('single')) return 'A';
    return secStr.replace(/section\s*/i, '').trim() || 'A';
  };

  // Update college autocomplete list with debounced SheerID search
  useEffect(() => {
    let isMounted = true;
    const delay = setTimeout(async () => {
      const results = await searchCollegesAsync(collegeSearch);
      if (isMounted) setFilteredColleges(results);
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(delay);
    };
  }, [collegeSearch]);

  // Query Firestore whenever college, branch, sem, or section changes
  useEffect(() => {
    if (!isOpen || activeTab !== 'directory') return;
    if (!selectedCollege.trim() || !branch.trim() || !semester) {
      setFoundBatch(null);
      return;
    }

    let isMounted = true;
    const checkBatch = async () => {
      setIsCheckingBatch(true);
      try {
        const secVal = cleanSection(section);
        const canonicalKey = getCanonicalBatchKey(selectedCollege, programme, branch, semester, secVal);
        const docRef = doc(db, 'shared_timetables', canonicalKey);
        const snap = await getDoc(docRef);

        if (isMounted) {
          if (snap.exists()) {
            setFoundBatch({ id: snap.id, ...snap.data() });
          } else {
            // Also try fuzzy search
            const q = query(
              collection(db, 'shared_timetables'),
              where('semester', '==', Number(semester))
            );
            const querySnap = await getDocs(q);
            const matched = querySnap.docs.find(d => {
              const data = d.data();
              const secMatch = !data.section || data.section.toUpperCase() === secVal.toUpperCase() || secVal === 'A';
              return data.college?.toLowerCase().includes(selectedCollege.toLowerCase().trim().slice(0, 5)) &&
                     data.branch?.toLowerCase().includes(branch.toLowerCase().trim().slice(0, 3)) &&
                     secMatch;
            });

            if (matched) {
              setFoundBatch({ id: matched.id, ...matched.data() });
            } else {
              setFoundBatch(null);
            }
          }
        }
      } catch (err) {
        console.warn('Error checking batch existence:', err);
      } finally {
        if (isMounted) setIsCheckingBatch(false);
      }
    };

    const timer = setTimeout(checkBatch, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedCollege, programme, branch, semester, section, isOpen, activeTab]);

  const handleSelectCollege = (col: CollegeItem) => {
    setSelectedCollege(col.shortName || col.name);
    setCollegeSearch(col.shortName || col.name);
    setShowCollegeDropdown(false);
  };

  const handleJoinDiscoveredBatch = async () => {
    if (!foundBatch) return;
    if (!user) {
      showToast('Sign In Required', 'Please sign in to sync with your batch.', 'info');
      try {
        localStorage.setItem('pending_join_invite', foundBatch.id);
      } catch (_) {}
      router.push('/sign-in');
      return;
    }

    setIsJoining(true);
    try {
      await joinBatchTimetable(foundBatch.id, foundBatch.inviteCode);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = inviteCodeInput.trim();
    if (!rawInput) return;

    const code = extractCleanInviteCode(rawInput);
    if (!code) {
      showToast('Invalid Code', 'Please enter a valid batch code or invite link.', 'error');
      return;
    }

    if (!user) {
      showToast('Sign In Required', 'Please sign in to join a batch.', 'info');
      try {
        localStorage.setItem('pending_join_invite', code);
      } catch (_) {}
      router.push('/sign-in');
      return;
    }

    setIsJoining(true);
    try {
      await joinBatchTimetable(code);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect with Your Class Batch" maxWidth="lg">
      <div className="flex flex-col gap-5 text-left pt-1">
        {/* TAB SWITCHER */}
        <div className="flex border border-[#D8D8D8] dark:border-[#333333] p-1 bg-[#F9F9F8] dark:bg-[#161616]">
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-2 text-[11.5px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111]'
                : 'text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF]'
            }`}
          >
            Enter Code / Link
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex-1 py-2 text-[11.5px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111]'
                : 'text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF]'
            }`}
          >
            Find in Directory
          </button>
        </div>

        {/* TAB 1: INVITE CODE */}
        {activeTab === 'code' && (
          <form onSubmit={handleJoinByCode} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#6F6F6F] dark:text-[#A0A0A0]">
                Batch Invite Code or Link
              </label>
              <p className="text-[12.5px] text-[#6F6F6F] dark:text-[#888888] leading-tight">
                Paste the 6-character Batch Code or direct invite link shared by your classmates.
              </p>
            </div>
            <div className="flex items-center gap-2.5 px-3.5 py-3 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] focus-within:border-[#111111] dark:focus-within:border-[#FFFFFF] transition-colors">
              <input
                type="text"
                placeholder="e.g. 65SQ9K or paste invite link"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                className="w-full bg-transparent text-[14px] text-[#111111] dark:text-[#FFFFFF] font-mono tracking-wider focus:outline-none placeholder:text-[#A0A0A0]"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isJoining}
              className="w-full h-11 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[12px] font-bold uppercase tracking-wider transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isJoining ? 'Connecting...' : 'Join Batch'}
            </button>
          </form>
        )}

        {/* TAB 2: DIRECTORY AUTO-DISCOVERY */}
        {activeTab === 'directory' && (
          <div className="flex flex-col gap-4">
            {/* College Selector (Strict Verification) */}
            <div className="relative">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F] dark:text-[#A0A0A0] mb-1.5">
                College / University
              </label>
              
              {selectedCollege ? (
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333]">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] truncate">{selectedCollege}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCollege('');
                      setCollegeSearch('');
                      setShowCollegeDropdown(true);
                    }}
                    className="text-[11px] font-bold text-[#111111] dark:text-[#FFFFFF] hover:underline uppercase tracking-wider shrink-0 ml-3 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                  <input
                    type="text"
                    placeholder="Search college name or acronym..."
                    value={collegeSearch}
                    onChange={(e) => {
                      setCollegeSearch(e.target.value);
                      setShowCollegeDropdown(true);
                    }}
                    onFocus={() => setShowCollegeDropdown(true)}
                    className="w-full pl-10 pr-4 py-2.5 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF]"
                    autoFocus
                  />
                  {showCollegeDropdown && filteredColleges.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white dark:bg-[#161616] border border-[#D8D8D8] dark:border-[#333333] shadow-lg divide-y divide-[#E5E5E5] dark:divide-[#2C2C2C]">
                      {filteredColleges.map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => handleSelectCollege(col)}
                          className="w-full px-4 py-2.5 text-left text-[13px] text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F4F4F4] dark:hover:bg-[#222222] transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-medium">{col.name}</span>
                          <span className="text-[11px] text-[#888888] font-mono ml-2 shrink-0">{col.state}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Grid of Programme, Branch, Sem, Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Branch */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F] dark:text-[#A0A0A0]">
                  Branch / Specialization
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] cursor-pointer"
                >
                  {STANDARD_BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Programme */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F] dark:text-[#A0A0A0]">
                  Degree / Programme
                </label>
                <select
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] cursor-pointer"
                >
                  {STANDARD_PROGRAMMES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F] dark:text-[#A0A0A0]">
                  Current Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F] dark:text-[#A0A0A0]">
                  Section / Group
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] cursor-pointer"
                >
                  {STANDARD_SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* LIVE DETECTION BANNER */}
            <div className="mt-2">
              {isCheckingBatch ? (
                <div className="p-4 bg-[#F9F9F8] dark:bg-[#161616] border border-[#D8D8D8] dark:border-[#333333] flex items-center justify-center gap-2 text-[13px] text-[#6F6F6F]">
                  <div className="w-4 h-4 border-2 border-[#111111] dark:border-[#FFFFFF] border-t-transparent rounded-full animate-spin" />
                  Checking campus directory...
                </div>
              ) : foundBatch ? (
                <div className="p-4 bg-[#F9F9F8] dark:bg-[#161616] border border-[#111111] dark:border-[#FFFFFF] flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wide">
                          Active Batch Found
                        </h4>
                        <p className="text-[12px] text-[#6F6F6F] dark:text-[#A0A0A0]">
                          {foundBatch.studentCount || 1} classmates connected & synced.
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold bg-black/5 dark:bg-white/10 text-[#111111] dark:text-[#FFFFFF] px-2 py-0.5 border border-[#D8D8D8] dark:border-[#333333]">
                      CODE: {foundBatch.inviteCode || 'ACTIVE'}
                    </span>
                  </div>

                  <p className="text-[12px] text-[#6F6F6F] dark:text-[#A0A0A0]">
                    Timetable with {(foundBatch.subjects || []).length} subjects and academic schedule ready to sync.
                  </p>

                  <button
                    type="button"
                    onClick={handleJoinDiscoveredBatch}
                    disabled={isJoining}
                    className="w-full h-11 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    {isJoining ? 'Syncing...' : 'Sync with This Batch'}
                  </button>
                </div>
              ) : profile.role === 'cr' || profile.role === 'super_admin' ? (
                <div className="p-4 bg-[#F9F9F8] dark:bg-[#161616] border border-[#D8D8D8] dark:border-[#333333] flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF]" />
                    <span className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wide">
                      Setup Official {isExplicitSection(section) ? `Section ${section} ` : ''}Timetable
                    </span>
                  </div>
                  <p className="text-[12px] text-[#6F6F6F] dark:text-[#A0A0A0] leading-relaxed">
                    As the Class Representative, publish the official timetable and broadcast updates to your classmates.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                    }}
                    className="w-full h-11 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Create {isExplicitSection(section) ? `Section ${section} ` : ''}Timetable
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-[#F9F9F8] dark:bg-[#161616] border border-[#D8D8D8] dark:border-[#333333] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF]" />
                      <span className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wide">
                        {isExplicitSection(section) ? `Section ${section} Has No Live Batch Yet` : 'No Live Batch Timetable Yet'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#6F6F6F] dark:text-[#A0A0A0] leading-relaxed">
                    Be the first to set up your batch timetable, apply for CR verification, or ask your classmates for the code.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSetupPromptModal(true)}
                    className="w-full h-11 border border-[#111111] dark:border-[#FFFFFF] text-[#111111] dark:text-[#FFFFFF] text-[12px] font-bold uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Setup Batch
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CRApplicationModal
        isOpen={showCRModal}
        onClose={() => setShowCRModal(false)}
        targetCollege={selectedCollege || collegeSearch}
        targetProgramme={programme}
        targetBranch={branch}
        targetSemester={semester}
        targetSection={section}
      />

      <BatchSetupPromptModal
        isOpen={showSetupPromptModal}
        onClose={() => setShowSetupPromptModal(false)}
        college={selectedCollege || collegeSearch}
        programme={programme}
        branch={branch}
        semester={semester}
        section={section}
        onContinuePersonal={() => {
          onClose();
        }}
      />
    </Modal>
  );
};
