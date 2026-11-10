'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { searchCollegesAsync, CollegeItem } from '@/lib/collegeDirectory';
import { filterProgrammes, filterBranches, getCanonicalProgramme } from '@/lib/colleges';
import { getShortCollegeName } from '@/lib/timetableUtils';
import { CRApplicationModal } from '@/components/cr/CRApplicationModal';
import { School, GraduationCap, Building2, Users, ArrowRight, Crown, BookOpen, Loader2, Search } from '@/components/ui/icons';
import { Illustration } from '@/components/ui/Illustration';
import { HandwrittenText } from '@/components/ui/HandwrittenText';
import { useRouter } from 'next/navigation';

interface SelectBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SelectBatchModal: React.FC<SelectBatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { 
    profile, 
    updateProfile, 
    searchBatchTimetable, 
    joinBatchTimetable, 
    showToast, 
    user, 
    setShowOnboarding 
  } = useApp();
  const router = useRouter();
  const isSignedIn = !!user;

  // Form State
  const [college, setCollege] = useState(profile.college || '');
  const [programme, setProgramme] = useState(profile.programme || 'B.Tech');
  const [branch, setBranch] = useState(profile.branch || '');
  const [semester, setSemester] = useState<number>(profile.semester || 1);
  const [section, setSection] = useState(profile.section || '');

  // Dropdown States
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [suggestedColleges, setSuggestedColleges] = useState<CollegeItem[]>([]);
  const [isLoadingColleges, setIsLoadingColleges] = useState(false);
  const [showProgrammeDropdown, setShowProgrammeDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Batch Search States
  const [isSearchingBatch, setIsSearchingBatch] = useState(false);
  const [matchedBatch, setMatchedBatch] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Pilot Modal State
  const [showPilotModal, setShowPilotModal] = useState(false);

  // College autocomplete debounced search
  useEffect(() => {
    let active = true;
    if (!college.trim()) {
      setSuggestedColleges([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoadingColleges(true);
      try {
        const results = await searchCollegesAsync(college);
        if (active) {
          setSuggestedColleges(results);
        }
      } catch (err) {
        console.error('Error searching colleges:', err);
      } finally {
        if (active) setIsLoadingColleges(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [college]);

  // Live Batch Search when all required fields are provided
  useEffect(() => {
    if (!isOpen) return;

    const trimmedCollege = college.trim();
    const trimmedBranch = branch.trim();
    const trimmedProgramme = programme.trim();

    if (!trimmedCollege || !trimmedBranch || !trimmedProgramme || !semester) {
      setMatchedBatch(null);
      setHasSearched(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsSearchingBatch(true);
      try {
        const found = await searchBatchTimetable(
          trimmedCollege,
          trimmedProgramme,
          trimmedBranch,
          Number(semester),
          section.trim()
        );
        if (active) {
          setMatchedBatch(found);
          setHasSearched(true);
        }
      } catch (err) {
        console.error('Error in batch live search:', err);
        if (active) {
          setMatchedBatch(null);
          setHasSearched(true);
        }
      } finally {
        if (active) setIsSearchingBatch(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [college, programme, branch, semester, section, isOpen, searchBatchTimetable]);

  const handleJoinBatch = async () => {
    if (!matchedBatch) return;

    if (!isSignedIn) {
      const pendingKey = matchedBatch.id || matchedBatch.inviteCode;
      try {
        localStorage.setItem('pending_join_invite', pendingKey);
      } catch (_) {}
      showToast('Sign In Required', 'Please sign in to join your class batch.', 'info');
      router.push('/sign-in');
      return;
    }

    setIsJoining(true);
    try {
      const batchKey = matchedBatch.id || matchedBatch.inviteCode;
      const userFullName = (user as any)?.fullName || profile.name || 'Student';
      const userEmail = (user as any)?.primaryEmailAddress?.emailAddress || profile.email || '';

      await joinBatchTimetable(batchKey, undefined, false, {
        name: userFullName,
        email: userEmail,
        rollNumber: profile.rollNumber || '',
      });

      // Update academic profile
      updateProfile({
        college: college.trim(),
        programme: getCanonicalProgramme(programme.trim()),
        branch: branch.trim(),
        semester: Number(semester),
        section: section.trim(),
        onboardingCompleted: true,
      });

      setShowOnboarding(false);
      showToast('Joined Batch! 🎉', `Connected to ${matchedBatch.branch || 'your batch'} timetable.`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error joining batch:', err);
      showToast('Join Failed', err?.message || 'Could not connect to batch.', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleContinuePersonal = () => {
    updateProfile({
      college: college.trim(),
      programme: getCanonicalProgramme(programme.trim()),
      branch: branch.trim(),
      semester: Number(semester),
      section: section.trim(),
      onboardingCompleted: true,
      isBatchSynced: false,
    });
    setShowOnboarding(false);
    showToast('Personal Timetable Ready', 'You can customize classes and invite classmates anytime.', 'success');
    if (onSuccess) onSuccess();
    onClose();
  };

  const isFormComplete = !!(college.trim() && programme.trim() && branch.trim() && semester);
  const filled = [college.trim(), programme.trim(), branch.trim(), semester ? 'x' : ''].filter(Boolean).length;
  const state: 'idle' | 'searching' | 'found' | 'missing' = isSearchingBatch
    ? 'searching'
    : matchedBatch
      ? 'found'
      : hasSearched && isFormComplete
        ? 'missing'
        : 'idle';

  const shortCollege = getShortCollegeName(matchedBatch?.college || college) || college;
  const sec = (matchedBatch?.section || section || '').trim();
  // Real member count for this programme (the stored counter drifts), fetched when a batch is matched
  const [liveCount, setLiveCount] = useState<{ key: string; n: number } | null>(null);
  const matchedKey: string = matchedBatch?.id || '';
  useEffect(() => {
    if (!matchedKey) return;
    let alive = true;
    fetch(`/api/batch/count?batchKey=${encodeURIComponent(matchedKey)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.success && typeof j.count === 'number') setLiveCount({ key: matchedKey, n: j.count });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [matchedKey]);
  const counted = liveCount && liveCount.key === matchedKey ? liveCount.n : null;
  const classmates = counted ?? 0;
  const subjectNames: string[] = (matchedBatch?.subjects || []).map((x: any) => x?.name).filter(Boolean);

  const field =
    'w-full h-11 bg-surface border border-line flex items-center gap-2.5 px-3 focus-within:border-fg transition-colors';
  const input = 'w-full min-w-0 bg-transparent text-[15px] text-fg placeholder:text-faint focus:outline-none';
  const menu = 'absolute top-full left-0 w-full mt-1 max-h-56 overflow-y-auto bg-surface border border-line shadow-xl z-50';

  const footer =
    state === 'found' ? (
      <button type="button" onClick={handleJoinBatch} disabled={isJoining} className="btn btn-primary btn-lg w-full">
        {isJoining ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Joining your class…
          </>
        ) : (
          <>
            Join this class <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    ) : state === 'missing' ? (
      <div className="flex flex-col-reverse sm:flex-row gap-2 w-full">
        <button type="button" onClick={handleContinuePersonal} className="btn btn-secondary btn-lg w-full sm:flex-1">
          Continue on my own
        </button>
        <button type="button" onClick={() => setShowPilotModal(true)} className="btn btn-primary btn-lg w-full sm:flex-1">
          <Crown className="w-4 h-4 text-amber-400" /> Set it up for my class
        </button>
      </div>
    ) : undefined;

  return (
    <>
      <Modal
        isOpen={isOpen && !showPilotModal}
        onClose={onClose}
        title="Find your class"
        description="Tell us where you study. We'll match you to your class's live timetable."
        maxWidth="2xl"
        mobileFullSheet={true}
        footer={footer}
      >
        <div className="flex flex-col gap-f5 text-left pt-1">
          {/* ── Hero ── */}
          <div className="flex items-center gap-4 border-b border-line-soft pb-f4">
            <Illustration name="friends" className="h-[92px] w-auto shrink-0 ai-float" />
            <div className="min-w-0 -rotate-2">
              <span className="hl-marker text-[26px] leading-none text-fg" style={{ ['--hl-delay' as any]: '1.3s' }}>
                <HandwrittenText text="let's find your people." playKey="batch-hero" delay={0.3} />
              </span>
              <p className="mt-2 rotate-2 text-[13px] text-muted leading-snug">Same class, same timetable, updated for everyone at once.</p>
            </div>
          </div>

          {/* ── Form ── */}
          <div className="flex flex-col gap-4">
            {/* College */}
            <div className="relative">
              <label htmlFor="sb-college" className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-muted">
                <span>College or university</span>
                {isLoadingColleges && (
                  <span className="flex items-center gap-1 text-[11px] font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> Searching
                  </span>
                )}
              </label>
              <div className={field}>
                <School className="w-4 h-4 text-muted shrink-0" />
                <input
                  id="sb-college"
                  type="text"
                  value={college}
                  onChange={(e) => {
                    setCollege(e.target.value);
                    setShowCollegeDropdown(true);
                  }}
                  onFocus={() => setShowCollegeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCollegeDropdown(false), 250)}
                  placeholder="Search your college"
                  autoComplete="off"
                  className={input}
                />
                {college && <span className="text-[11px] text-muted shrink-0">{getShortCollegeName(college)}</span>}
              </div>
              {showCollegeDropdown && suggestedColleges.length > 0 && (
                <div className={menu}>
                  {suggestedColleges.map((col, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onMouseDown={() => {
                        setCollege(col.name);
                        setShowCollegeDropdown(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-surface-2 cursor-pointer border-b border-line-soft last:border-0"
                    >
                      <span className="block text-[14px] font-medium text-fg leading-snug">{col.name}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                        {col.state || 'India'}
                        {col.shortName && col.shortName !== col.name && <span className="px-1.5 bg-surface-2 border border-line-soft text-[11px] font-semibold">{col.shortName}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Degree + section */}
            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
              <div className="relative">
                <label htmlFor="sb-prog" className="block mb-1.5 text-[12px] font-semibold text-muted">
                  Degree
                </label>
                <div className={field}>
                  <GraduationCap className="w-4 h-4 text-muted shrink-0" />
                  <input
                    id="sb-prog"
                    type="text"
                    value={programme}
                    onChange={(e) => {
                      setProgramme(e.target.value);
                      setShowProgrammeDropdown(true);
                    }}
                    onFocus={() => setShowProgrammeDropdown(true)}
                    onBlur={() => setTimeout(() => setShowProgrammeDropdown(false), 200)}
                    placeholder="B.Tech, BCA, MCA"
                    autoComplete="off"
                    className={input}
                  />
                </div>
                {showProgrammeDropdown && (
                  <div className={menu}>
                    {filterProgrammes(programme).map((p) => (
                      <button
                        type="button"
                        key={p}
                        onMouseDown={() => {
                          setProgramme(p);
                          setShowProgrammeDropdown(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-surface-2 cursor-pointer text-[14px] text-fg border-b border-line-soft last:border-0"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="sb-sec" className="block mb-1.5 text-[12px] font-semibold text-muted">
                  Section
                </label>
                <div className={field}>
                  <input
                    id="sb-sec"
                    type="text"
                    maxLength={6}
                    value={section}
                    onChange={(e) => setSection(e.target.value.toUpperCase())}
                    placeholder="Optional"
                    autoComplete="off"
                    className={`${input} uppercase placeholder:normal-case font-semibold`}
                  />
                </div>
              </div>
            </div>

            {/* Branch */}
            <div className="relative">
              <label htmlFor="sb-branch" className="block mb-1.5 text-[12px] font-semibold text-muted">
                Branch
              </label>
              <div className={field}>
                <Building2 className="w-4 h-4 text-muted shrink-0" />
                <input
                  id="sb-branch"
                  type="text"
                  value={branch}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setShowBranchDropdown(true);
                  }}
                  onFocus={() => setShowBranchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowBranchDropdown(false), 200)}
                  placeholder="Computer Science (CSE)"
                  autoComplete="off"
                  className={input}
                />
              </div>
              {showBranchDropdown && (
                <div className={menu}>
                  {filterBranches(branch)
                    .slice(0, 10)
                    .map((b) => (
                      <button
                        type="button"
                        key={b}
                        onMouseDown={() => {
                          setBranch(b);
                          setShowBranchDropdown(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-surface-2 cursor-pointer text-[14px] text-fg border-b border-line-soft last:border-0"
                      >
                        {b}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Semester chips */}
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-muted">Semester</p>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5" role="radiogroup" aria-label="Semester">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                  const on = Number(semester) === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setSemester(n)}
                      className={`h-10 text-[14px] font-semibold tabular-nums border transition-colors cursor-pointer ${
                        on ? 'bg-ink text-on-ink border-ink' : 'bg-surface text-fg border-line hover:border-line-strong'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Result ── */}
          <div aria-live="polite">
            {state === 'searching' && (
              <div className="border border-line bg-surface p-5 flex items-center gap-4">
                <div className="relative w-16 h-16 shrink-0 border border-line bg-surface-2 overflow-hidden" aria-hidden="true">
                  <div className="absolute inset-2 grid grid-cols-3 gap-1">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <span key={i} className="bg-line" />
                    ))}
                  </div>
                  <span className="ai-scanline absolute left-0 right-0 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-fg">Looking for your class…</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {shortCollege} · {programme} · Sem {semester}
                  </p>
                </div>
              </div>
            )}

            {state === 'found' && (
              <div>
                <div className="flex justify-end pr-3 pb-1.5 rotate-[2deg] text-[21px] leading-none text-fg" aria-hidden="true">
                  <span className="hl-marker" style={{ ['--hl-delay' as any]: '1.1s' }}><HandwrittenText text="found them!" playKey="batch-found" delay={0.3} /></span>
                </div>
                <div className="sb-found border border-fg bg-surface">
                  <div className="sheen-ink bg-ink text-on-ink px-4 py-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[12px] font-semibold">
                      <span className="relative flex w-2 h-2">
                        <span className="absolute inset-0 bg-emerald-400 animate-ping opacity-60" />
                        <span className="relative w-2 h-2 bg-emerald-400" />
                      </span>
                      Your class is live
                    </span>
                    <span className="text-[12px] opacity-70">Kept up to date by your CR</span>
                  </div>
                  <div className="p-4 sm:p-5">
                    <h3 className="text-[19px] sm:text-[21px] font-semibold text-fg leading-snug tracking-tight">{matchedBatch.branch || branch}</h3>
                    <p className="mt-1 text-[13px] text-muted">
                      {shortCollege} · {matchedBatch.programme || programme} · Semester {matchedBatch.semester || semester}
                      {sec ? ` · Section ${sec}` : ''}
                    </p>

                    <div className="mt-4 grid grid-cols-2 divide-x divide-line-soft border-y border-line-soft">
                      <div className="py-3 pr-3 flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-muted shrink-0" />
                        {counted === null ? (
                          <span className="h-3.5 w-24 bg-surface-2 animate-pulse" aria-label="Counting classmates" />
                        ) : (
                          <p className="text-[14px] text-fg">
                            {classmates === 0 ? (
                              'Be the first here'
                            ) : (
                              <>
                                <span className="font-semibold tabular-nums">{classmates}</span> {classmates === 1 ? 'classmate' : 'classmates'}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="py-3 pl-3 flex items-center gap-2.5">
                        <BookOpen className="w-4 h-4 text-muted shrink-0" />
                        <p className="text-[14px] text-fg">
                          <span className="font-semibold tabular-nums">{subjectNames.length || matchedBatch.subjects?.length || 0}</span> subjects
                        </p>
                      </div>
                    </div>

                    {subjectNames.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-2">
                        {subjectNames.slice(0, 4).map((n, i) => (
                          <li key={n} className="flex items-center gap-2.5 min-w-0 text-[13px] text-fg-2">
                            <span className={`w-2 h-2 shrink-0 ${['bg-sky-400', 'bg-orange-300', 'bg-emerald-400', 'bg-violet-400'][i % 4]}`} />
                            <span className="truncate">{n}</span>
                          </li>
                        ))}
                        {subjectNames.length > 4 && <li className="pl-[18px] text-[12px] font-medium text-muted">+{subjectNames.length - 4} more</li>}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {state === 'missing' && (
              <div className="border-2 border-dashed border-amber-500/40 bg-amber-500/[0.06] p-5 sm:p-6 flex flex-col items-center text-center">
                <div className="relative">
                  <Illustration name="pilot" className="h-[120px] w-auto ai-float" />
                  <div className="absolute -right-16 top-2 rotate-[4deg] text-[21px] leading-none text-fg whitespace-nowrap" aria-hidden="true">
                    <span className="hl-marker" style={{ ['--hl-delay' as any]: '1.2s' }}><HandwrittenText text="be the first!" playKey="batch-pilot" delay={0.4} /></span>
                  </div>
                </div>
                <span className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  <Crown className="w-3.5 h-3.5" /> Batch Pilot spot open
                </span>
                <h4 className="mt-2 text-[17px] font-semibold text-fg">Your class isn&apos;t here yet</h4>
                <p className="mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-muted">
                  No one has set up {getShortCollegeName(college)} · {branch} · Sem {semester} yet. Set it up once and everyone in your class
                  gets the timetable, as Batch Pilot.
                </p>
              </div>
            )}

            {state === 'idle' && (
              <div className="border border-line-soft bg-surface-2/60 p-5 flex items-center gap-4">
                <span className="w-11 h-11 shrink-0 flex items-center justify-center bg-surface border border-line">
                  <Search className="w-5 h-5 text-muted" />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-fg">Your class shows up here</p>
                  <p className="mt-0.5 text-[13px] text-muted leading-snug">Fill in the details above. We search as you type.</p>
                  <div className="mt-2.5 flex items-center gap-1" aria-label={`${filled} of 4 filled`}>
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={`h-1 w-6 transition-colors ${i < filled ? 'bg-fg' : 'bg-line'}`} />
                    ))}
                    <span className="ml-1.5 text-[11px] font-semibold text-muted tabular-nums">{filled}/4</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Embedded Pilot Application Modal */}
      <CRApplicationModal
        isOpen={showPilotModal}
        onClose={() => setShowPilotModal(false)}
        targetCollege={college}
        targetProgramme={programme}
        targetBranch={branch}
        targetSemester={Number(semester)}
        targetSection={section}
      />
    </>
  );
};
