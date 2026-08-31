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
import { getCanonicalBatchKey, isExplicitSection, formatBatchDisplayName } from '@/lib/timetableUtils';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Sparkles, Users, CheckCircle2, ArrowRight, ShieldCheck, School, BookOpen, Layers, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CRApplicationModal } from '@/components/cr/CRApplicationModal';
import { BatchSetupPromptModal } from '@/components/batch/BatchSetupPromptModal';

interface BatchDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchDiscoveryModal: React.FC<BatchDiscoveryModalProps> = ({ isOpen, onClose }) => {
  const { profile, joinBatchTimetable, showToast, user } = useApp();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'directory' | 'code'>('directory');
  
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
    let code = inviteCodeInput.trim();
    if (!code) return;

    if (code.includes('invite=')) {
      code = new URLSearchParams(code.split('?')[1] || '').get('invite') || code;
    } else if (code.includes('/join/')) {
      code = code.split('/join/').pop()?.split('?')[0] || code;
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
        <div className="flex p-1 bg-[#F4F4F4] dark:bg-[#1C1C1E] rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
              activeTab === 'directory'
                ? 'bg-white dark:bg-[#2C2C2E] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🏫 Find My College & Branch
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
              activeTab === 'code'
                ? 'bg-white dark:bg-[#2C2C2E] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🔑 Have an Invite Code / Link
          </button>
        </div>

        {/* TAB 1: DIRECTORY AUTO-DISCOVERY */}
        {activeTab === 'directory' && (
          <div className="flex flex-col gap-4">
            {/* College Selector (Strict Verification) */}
            <div className="relative">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                College / University
              </label>
              
              {selectedCollege ? (
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 shadow-sm">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[13px] font-bold text-indigo-950 dark:text-indigo-200 truncate">{selectedCollege}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCollege('');
                      setCollegeSearch('');
                      setShowCollegeDropdown(true);
                    }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wider shrink-0 ml-3 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search e.g. IIIT Naya Raipur, VIT, IIT Delhi..."
                    value={collegeSearch}
                    onChange={(e) => {
                      setCollegeSearch(e.target.value);
                      setShowCollegeDropdown(true);
                    }}
                    onFocus={() => setShowCollegeDropdown(true)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  {showCollegeDropdown && filteredColleges.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl divide-y divide-slate-100 dark:divide-zinc-800">
                      {filteredColleges.map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => handleSelectCollege(col)}
                          className="w-full px-4 py-2.5 text-left text-[13px] text-slate-800 dark:text-zinc-200 hover:bg-indigo-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-medium">{col.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono ml-2 shrink-0">{col.state}</span>
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
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Branch / Specialization
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {STANDARD_BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Programme */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Degree / Programme
                </label>
                <select
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {STANDARD_PROGRAMMES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Current Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Section / Group
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 flex items-center justify-center gap-2 text-[13px] text-slate-500">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  Checking campus directory...
                </div>
              ) : foundBatch ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="text-[14px] font-bold text-emerald-900 dark:text-emerald-200">
                          Active Batch Found! 🎉
                        </h4>
                        <p className="text-[12px] text-emerald-700 dark:text-emerald-400">
                          {foundBatch.studentCount || 1} classmates already connected & synced.
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                      Code: {foundBatch.inviteCode || 'Active'}
                    </span>
                  </div>

                  <p className="text-[12px] text-emerald-800/80 dark:text-emerald-300">
                    Timetable with {(foundBatch.subjects || []).length} subjects, faculty details, and live cancelled class alerts ready to sync.
                  </p>

                  <button
                    type="button"
                    onClick={handleJoinDiscoveredBatch}
                    disabled={isJoining}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isJoining ? 'Syncing...' : '⚡ 1-Tap Sync with This Batch'}
                  </button>
                </div>
              ) : profile.role === 'cr' || profile.role === 'super_admin' ? (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-[13px] font-bold text-indigo-900 dark:text-indigo-200">
                      Setup Official {isExplicitSection(section) ? `Section ${section} ` : ''}Timetable
                    </span>
                  </div>
                  <p className="text-[12px] text-indigo-700/80 dark:text-indigo-300 leading-relaxed">
                    As the verified Class Representative, scan your timetable once with AI to publish and broadcast the schedule to your classmates!
                  </p>
                  <Button
                    onClick={() => {
                      onClose();
                    }}
                    className="w-full h-10 text-[13px]"
                  >
                    Scan & Create {isExplicitSection(section) ? `Section ${section} ` : ''}Timetable
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-[13px] font-bold text-amber-950 dark:text-amber-200">
                        {isExplicitSection(section) ? `Section ${section} Has No Live Batch Yet` : 'No Live Batch Timetable Yet'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[12px] text-amber-800/90 dark:text-amber-300 leading-relaxed">
                    Be the first to set up your batch, apply for CR verification, or ask your classmates to join via WhatsApp!
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSetupPromptModal(true)}
                    className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-black text-[13px] font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Crown className="w-4 h-4" />
                    Setup / Request Batch
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INVITE CODE */}
        {activeTab === 'code' && (
          <form onSubmit={handleJoinByCode} className="flex flex-col gap-4">
            <p className="text-[13px] text-slate-600 dark:text-zinc-400">
              Paste the Batch Invite Code shared by your CR or classmate via WhatsApp.
            </p>
            <input
              type="text"
              placeholder="e.g. 65SQ9K"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[14px] text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={isJoining}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-[14px] font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isJoining ? 'Connecting...' : 'Join Batch'}
            </button>
          </form>
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
