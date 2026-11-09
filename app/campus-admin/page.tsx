'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { getAuthHeaders } from '@/lib/authHeaders';
import { PromotionalCampaign } from '@/lib/types';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CampaignComposer, CampaignFormState, EMPTY_CAMPAIGN_FORM } from '@/components/admin/CampaignComposer';
import { isCampaignRunning, getCategoryMeta } from '@/components/ads/CampusSpotlightCard';
import { btn, surface, divider, muted, strong, PageTitle, SectionHead, Badge, StatTile, Segmented, SearchField, Empty, AttentionRow, timeAgo } from '@/components/admin/AdminUI';
import { ArrowLeft, BarChart3, Crown, Megaphone, Users, Layers, Plus, Building2, Loader2, Bell, Check, X, Edit2, Trash2, Pause, Play } from '@/components/ui/icons';

// Campus admin panel: one college only. Every list comes from /api/campus-admin/*, which checks the
// caller's campus_admins record and filters to that college on the server.

type Tab = 'overview' | 'requests' | 'notices' | 'students' | 'batches';
type Student = { id: string; name: string; email: string; rollNumber: string; programme: string; branch: string; semester: number | null; section: string; role: string; batchKey: string; lastUpdated: number; hasPush: boolean };
type Batch = { id: string; programme: string; branch: string; semester: number | null; section: string; inviteCode: string; creatorName: string; pilotCount: number; members: number; createdAt: string };
type Request = { id: string; name: string; email: string; phone: string; programme: string; branch: string; semester: number | null; section: string; status: string; createdAt: string; inviteCode: string };
type Overview = { college: string; collegeKey: string; students: Student[]; batches: Batch[]; requests: Request[]; campaigns: PromotionalCampaign[] };

const roleLabel = (r: string) => (r === 'cr' ? 'Batch pilot' : r === 'faculty' ? 'Faculty' : r === 'campus_admin' ? 'Campus admin' : r === 'super_admin' ? 'Super admin' : 'Student');
const batchLabel = (b: { programme?: string; branch?: string; semester?: number | null; section?: string }) =>
  [b.programme, b.branch, b.semester ? `Sem ${b.semester}` : '', b.section ? `Sec ${b.section}` : ''].filter(Boolean).join(' · ') || 'Batch';
const displayName = (s: { name?: string; email?: string }) => (s.name && s.name.toLowerCase() !== 'student' ? s.name : s.email ? s.email.split('@')[0] : 'Unnamed student');
const status = (c: PromotionalCampaign): 'live' | 'paused' | 'ended' => (!c.isActive ? 'paused' : isCampaignRunning(c) ? 'live' : 'ended');

const matchesTargets = (s: Student, f: CampaignFormState) => {
  const b = (s.branch || '').toLowerCase();
  const bOk = f.branchTargeting === 'all' || (!!b && f.targetBranches.some((x) => b.includes(x.toLowerCase()) || x.toLowerCase().includes(b)));
  const sOk = f.semesterTargeting === 'all' || f.targetSemesters.includes(Number(s.semester));
  return bOk && sOk;
};

export default function CampusAdminPage() {
  const { user, isClerkLoaded, showToast } = useApp();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');

  const [studentQuery, setStudentQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'cr' | 'student' | 'other'>('all');
  const [batchQuery, setBatchQuery] = useState('');
  const [reqFilter, setReqFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [busyRequest, setBusyRequest] = useState<string | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignFormState>(EMPTY_CAMPAIGN_FORM);
  const [toDelete, setToDelete] = useState<PromotionalCampaign | null>(null);

  const previewQuery = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('college') : null;
  const withPreview = (path: string) => (previewQuery ? `${path}?college=${encodeURIComponent(previewQuery)}` : path);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(withPreview('/api/campus-admin/overview'), { headers: await getAuthHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not load your campus');
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Could not load your campus');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isClerkLoaded) return;
    if (!user) {
      setLoading(false);
      setError('Sign in with your campus admin account to continue.');
      return;
    }
    load();
  }, [isClerkLoaded, user, load]);

  const students = data?.students || [];
  const batches = data?.batches || [];
  const requests = data?.requests || [];
  const campaigns = data?.campaigns || [];
  const pending = requests.filter((r) => r.status === 'pending');
  const live = campaigns.filter((c) => status(c) === 'live');
  const totalViews = campaigns.reduce((n, c) => n + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((n, c) => n + (c.clicks || 0), 0);
  const weekAgo = Date.now() - 7 * 86400000;
  const activeThisWeek = students.filter((s) => s.lastUpdated > weekAgo).length;
  const withPush = students.filter((s) => s.hasPush).length;

  const visibleStudents = useMemo(() => {
    const q = studentQuery.toLowerCase().trim();
    return students
      .filter((s) => (roleFilter === 'all' ? true : roleFilter === 'other' ? !['cr', 'student'].includes(s.role) : s.role === roleFilter))
      .filter((s) => !q || [s.name, s.email, s.rollNumber, s.branch, s.programme].some((v) => (v || '').toLowerCase().includes(q)))
      .sort((a, b) => b.lastUpdated - a.lastUpdated);
  }, [students, studentQuery, roleFilter]);

  const visibleBatches = useMemo(() => {
    const q = batchQuery.toLowerCase().trim();
    return batches.filter((b) => !q || [batchLabel(b), b.inviteCode, b.creatorName].some((v) => (v || '').toLowerCase().includes(q))).sort((a, b) => b.members - a.members);
  }, [batches, batchQuery]);

  const branchOptions = useMemo(() => Array.from(new Set(students.map((s) => s.branch).filter(Boolean))).slice(0, 24), [students]);
  const reach = useMemo(() => students.filter((s) => matchesTargets(s, form)).length, [students, form]);
  const editing = editingId ? campaigns.find((c) => c.id === editingId) : null;

  // ---------- actions ----------
  const decideRequest = async (r: Request, action: 'approve' | 'reject') => {
    setBusyRequest(r.id);
    try {
      const res = await fetch(withPreview('/api/campus-admin/cr-request'), { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ requestId: r.id, action }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not update the request');
      showToast(action === 'approve' ? 'Batch pilot approved' : 'Request rejected', action === 'approve' ? `${displayName(r)} · batch code ${json.batchCode}` : displayName(r), action === 'approve' ? 'success' : 'info');
      await load();
    } catch (e: any) {
      showToast('Something went wrong', e.message, 'error');
    } finally {
      setBusyRequest(null);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_CAMPAIGN_FORM, targetAudienceType: 'custom', targetColleges: data ? [data.college] : [], sendPush: false });
    setComposerOpen(true);
  };

  const openEdit = (c: PromotionalCampaign) => {
    setEditingId(c.id);
    setForm({
      ...EMPTY_CAMPAIGN_FORM,
      title: c.title || '',
      subtitle: c.subtitle || '',
      description: c.description || '',
      imageUrl: c.imageUrl || '',
      ctaText: c.ctaText || 'Learn more',
      targetUrl: c.targetUrl || '',
      category: c.category || 'general',
      badgeText: c.badgeText || '',
      targetAudienceType: 'custom',
      targetColleges: data ? [data.college] : [],
      branchTargeting: c.targetBranches?.length ? 'custom' : 'all',
      targetBranches: c.targetBranches || [],
      semesterTargeting: c.targetSemesters?.length ? 'custom' : 'all',
      targetSemesters: c.targetSemesters || [],
      isActive: c.isActive,
      expiresOn: c.expiresAt ? new Date(c.expiresAt).toISOString().split('T')[0] : '',
      sendPush: false,
    });
    setComposerOpen(true);
  };

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch(withPreview('/api/campus-admin/campaigns'), { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(json.error || 'Could not save');
    return json;
  };

  const save = async (publish: boolean): Promise<boolean> => {
    try {
      const json = await post({
        action: 'save',
        id: editingId || undefined,
        sendPush: publish && !!form.sendPush,
        campaign: {
          title: form.title,
          subtitle: form.subtitle,
          description: form.description,
          imageUrl: form.imageUrl,
          ctaText: form.ctaText,
          targetUrl: form.targetUrl,
          category: form.category,
          badgeText: form.badgeText,
          targetBranches: form.branchTargeting === 'custom' ? form.targetBranches : [],
          targetSemesters: form.semesterTargeting === 'custom' ? form.targetSemesters : [],
          isActive: publish,
          expiresAt: form.expiresOn ? new Date(`${form.expiresOn}T23:59:59`).toISOString() : null,
        },
      });
      if (json.pushError) showToast('Notice saved', json.pushError, 'info');
      else if (typeof json.pushed === 'number') showToast('Notice live', `Notification sent to ${json.pushed} ${json.pushed === 1 ? 'device' : 'devices'}.`, 'success');
      else showToast(publish ? 'Notice live' : 'Saved as paused', publish ? 'Students of your college can see it now.' : 'Publish it whenever you are ready.', 'success');
      await load();
      return true;
    } catch (e: any) {
      showToast('Could not save', e.message, 'error');
      return false;
    }
  };

  const toggle = async (c: PromotionalCampaign) => {
    try {
      await post({ action: 'toggle', id: c.id });
      await load();
    } catch (e: any) {
      showToast('Could not update', e.message, 'error');
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await post({ action: 'delete', id: toDelete.id });
      showToast('Notice deleted', toDelete.title, 'info');
      setToDelete(null);
      await load();
    } catch (e: any) {
      showToast('Could not delete', e.message, 'error');
    }
  };

  // ---------- states ----------
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-canvas">
        <Loader2 className={`w-6 h-6 animate-spin ${muted}`} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-f4 px-f5 text-center bg-canvas">
        <span className={`w-12 h-12 flex items-center justify-center border border-line ${strong}`}>
          <Building2 className="w-5 h-5" />
        </span>
        <div>
          <p className={`text-[18px] font-semibold ${strong}`}>Campus admin</p>
          <p className={`mt-1 text-[14px] max-w-sm ${muted}`}>{error || 'Could not load your campus.'}</p>
        </div>
        <Link href="/" className={btn.secondary}>
          <ArrowLeft className="w-4 h-4" /> Back to the app
        </Link>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number; alert?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'requests', label: 'Requests', icon: Crown, count: pending.length, alert: pending.length > 0 },
    { id: 'notices', label: 'Notices & ads', icon: Megaphone, count: live.length },
    { id: 'students', label: 'Students', icon: Users, count: students.length },
    { id: 'batches', label: 'Batches', icon: Layers, count: batches.length },
  ];

  const noticeCard = (c: PromotionalCampaign) => {
    const st = status(c);
    const meta = getCategoryMeta(c.category);
    const ctr = c.impressions ? (((c.clicks || 0) / c.impressions) * 100).toFixed(1) : '0.0';
    const audience = [c.targetBranches?.length ? c.targetBranches.join(', ') : 'All branches', c.targetSemesters?.length ? `Sem ${c.targetSemesters.join(', ')}` : 'All semesters'].join(' · ');
    return (
      <div key={c.id} className={`${surface} flex flex-col`}>
        <div className="p-f4 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={st === 'live' ? 'green' : st === 'paused' ? 'neutral' : 'amber'} dot>
              {st === 'live' ? 'Live' : st === 'paused' ? 'Paused' : 'Ended'}
            </Badge>
            <Badge>{meta.label}</Badge>
            {c.pushSentAt && (
              <Badge tone="blue">
                <Bell className="w-3 h-3" /> Notified {c.pushRecipients ?? ''}
              </Badge>
            )}
          </div>
          <p className={`mt-f3 text-[16px] font-semibold leading-snug ${strong}`}>{c.title}</p>
          {c.subtitle && <p className={`mt-1 text-[14px] leading-snug ${muted}`}>{c.subtitle}</p>}
          <p className={`mt-f2 text-[12px] ${muted}`}>{audience}</p>
          <p className={`mt-1 text-[12px] tabular-nums ${muted}`}>
            {(c.impressions || 0).toLocaleString()} views · {(c.clicks || 0).toLocaleString()} clicks · {ctr}% · {timeAgo(c.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1 px-f3 py-f2 border-t border-line-soft">
          <button type="button" onClick={() => openEdit(c)} className={btn.ghost}>
            <Edit2 className="w-4 h-4" /> Edit
          </button>
          <button type="button" onClick={() => toggle(c)} className={btn.ghost}>
            {c.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {c.isActive ? 'Pause' : 'Publish'}
          </button>
          <button type="button" onClick={() => setToDelete(c)} className={`${btn.ghost} ml-auto hover:text-rose-600`}>
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-canvas pb-f7 font-sans">
      <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur-xl border-b border-line" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-6xl mx-auto px-f4 sm:px-f5">
          <div className="h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/" className={btn.icon} aria-label="Back to the app">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <h1 className={`text-[17px] font-semibold leading-tight ${strong}`}>Campus admin</h1>
                <p className={`text-[12px] leading-tight truncate ${muted}`} title={data.college}>{data.college}</p>
              </div>
            </div>
            <Badge tone="violet">
              <Building2 className="w-3.5 h-3.5" /> {data.collegeKey}
            </Badge>
          </div>
          <nav aria-label="Campus admin sections" className="-mx-f4 sm:mx-0 px-f4 sm:px-0 flex gap-1 overflow-x-auto no-scrollbar">
            {TABS.map((t) => {
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={on ? 'page' : undefined}
                  className={`relative shrink-0 h-11 px-3 inline-flex items-center gap-2 text-[14px] font-medium transition-colors cursor-pointer ${on ? strong : `${muted} hover:text-fg`}`}
                >
                  <t.icon className="w-4 h-4" strokeWidth={1.9} />
                  {t.label}
                  {typeof t.count === 'number' && t.count > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center text-[11px] font-semibold tabular-nums ${t.alert ? 'bg-rose-500 text-white' : 'bg-surface-3 text-current'}`}>
                      {t.count}
                    </span>
                  )}
                  {on && <motion.span layoutId="campus-tab" className="absolute left-2 right-2 -bottom-px h-[2px] bg-ink" />}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-f4 sm:px-f5 pt-f5 sm:pt-f6 flex flex-col gap-f6">
        {tab === 'overview' && (
          <>
            <PageTitle title="Your campus" description="Students, batches and notices for your college only." />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-f3">
              <StatTile label="Students" value={students.length.toLocaleString()} hint={`${activeThisWeek} active this week`} onClick={() => setTab('students')} />
              <StatTile label="Batches" value={batches.length} hint={`${batches.reduce((n, b) => n + b.pilotCount, 0)} batch pilots`} onClick={() => setTab('batches')} />
              <StatTile label="Live notices" value={live.length} hint={`${campaigns.length} total`} onClick={() => setTab('notices')} />
              <StatTile label="Reachable by notification" value={withPush.toLocaleString()} hint={students.length ? `${Math.round((withPush / students.length) * 100)}% of students` : undefined} />
            </div>
            <section>
              <SectionHead title="Needs attention" />
              <div className={`${surface} ${divider}`}>
                {pending.length > 0 ? (
                  <AttentionRow icon={Crown} tone="amber" title={`${pending.length} batch pilot ${pending.length === 1 ? 'request' : 'requests'} waiting`} hint="Approve to create the batch and its join code" onClick={() => setTab('requests')} />
                ) : (
                  <AttentionRow icon={Check} tone="neutral" title="No pending requests" hint="New batch pilot requests from your college show up here" onClick={() => setTab('requests')} />
                )}
                <AttentionRow icon={Megaphone} tone="blue" title="Post a notice" hint="Events, deadlines or offers for your college, with an optional notification" onClick={openNew} />
              </div>
            </section>
          </>
        )}

        {tab === 'requests' && (
          <>
            <PageTitle title="Batch pilot requests" description="Approving makes the student the batch pilot and creates the batch's join code." />
            <Segmented
              ariaLabel="Filter requests"
              value={reqFilter}
              onChange={setReqFilter}
              options={(['pending', 'approved', 'rejected'] as const).map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1), count: requests.filter((r) => r.status === s).length }))}
            />
            {requests.filter((r) => r.status === reqFilter).length === 0 ? (
              <Empty icon={Crown} title="Nothing here" body={reqFilter === 'pending' ? 'No one from your college is waiting for approval.' : `No ${reqFilter} requests.`} />
            ) : (
              <div className={`${surface} ${divider}`}>
                {requests
                  .filter((r) => r.status === reqFilter)
                  .map((r) => (
                    <div key={r.id} className="p-f4 flex flex-col sm:flex-row sm:items-center gap-f3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-semibold ${strong}`}>{displayName(r)}</p>
                        <p className={`text-[13px] ${muted}`}>{batchLabel(r)}</p>
                        <p className={`text-[12px] ${muted} truncate`}>{[r.email, r.phone, timeAgo(r.createdAt)].filter(Boolean).join(' · ')}</p>
                        {r.status === 'approved' && r.inviteCode && <p className={`mt-1 text-[12px] font-mono ${strong}`}>Code {r.inviteCode}</p>}
                      </div>
                      {r.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button type="button" disabled={busyRequest === r.id} onClick={() => decideRequest(r, 'reject')} className={btn.secondary}>
                            <X className="w-4 h-4" /> Reject
                          </button>
                          <button type="button" disabled={busyRequest === r.id} onClick={() => decideRequest(r, 'approve')} className={btn.primary}>
                            {busyRequest === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {tab === 'notices' && (
          <>
            <PageTitle
              title="Notices & ads"
              description="Cards on your college's home screens. Only students of your college see them."
              action={
                <button type="button" onClick={openNew} className={btn.primary}>
                  <Plus className="w-4 h-4" /> New notice
                </button>
              }
            />
            <div className="grid grid-cols-3 gap-f3">
              <StatTile label="Views" value={totalViews.toLocaleString()} />
              <StatTile label="Clicks" value={totalClicks.toLocaleString()} />
              <StatTile label="Click rate" value={`${totalViews ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0'}%`} />
            </div>
            {campaigns.length === 0 ? (
              <Empty
                icon={Megaphone}
                title="No notices yet"
                body="Post an event, a deadline or an offer for your college. You can also notify students' phones."
                action={
                  <button type="button" onClick={openNew} className={btn.primary}>
                    <Plus className="w-4 h-4" /> New notice
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-f3">{campaigns.map(noticeCard)}</div>
            )}
          </>
        )}

        {tab === 'students' && (
          <>
            <PageTitle title="Students" description={`${students.length.toLocaleString()} students from your college use Intersemester.`} />
            <div className="flex flex-col sm:flex-row gap-f3">
              <SearchField value={studentQuery} onChange={setStudentQuery} placeholder="Search name, email, roll number, branch" className="flex-1" />
              <Segmented
                ariaLabel="Filter by role"
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { id: 'all', label: 'All', count: students.length },
                  { id: 'cr', label: 'Pilots', count: students.filter((s) => s.role === 'cr').length },
                  { id: 'student', label: 'Students', count: students.filter((s) => s.role === 'student').length },
                  { id: 'other', label: 'Others', count: students.filter((s) => !['cr', 'student'].includes(s.role)).length },
                ]}
              />
            </div>
            {visibleStudents.length === 0 ? (
              <Empty icon={Users} title="No students found" body="Try a different search." />
            ) : (
              <div className={`${surface} ${divider}`}>
                {visibleStudents.slice(0, 300).map((s) => (
                  <div key={s.id} className="px-f4 py-f3 flex items-center gap-f3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-[15px] font-medium truncate ${strong}`}>{displayName(s)}</p>
                        {s.role !== 'student' && <Badge tone={s.role === 'cr' ? 'amber' : 'blue'}>{roleLabel(s.role)}</Badge>}
                      </div>
                      <p className={`text-[13px] truncate ${muted}`}>
                        {[s.email, [s.programme, s.branch].filter(Boolean).join(' '), s.semester ? `Sem ${s.semester}` : '', s.rollNumber].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {s.hasPush && <Bell className={`w-4 h-4 ${muted}`} aria-label="Notifications on" />}
                      <span className={`text-[12px] tabular-nums ${muted}`}>{s.lastUpdated ? timeAgo(new Date(s.lastUpdated).toISOString()) : ''}</span>
                    </div>
                  </div>
                ))}
                {visibleStudents.length > 300 && <p className={`px-f4 py-f3 text-[13px] ${muted}`}>Showing 300 of {visibleStudents.length}. Search to narrow down.</p>}
              </div>
            )}
          </>
        )}

        {tab === 'batches' && (
          <>
            <PageTitle title="Batches" description="Classes from your college that share a timetable." />
            <SearchField value={batchQuery} onChange={setBatchQuery} placeholder="Search branch, semester, code, pilot" />
            {visibleBatches.length === 0 ? (
              <Empty icon={Layers} title="No batches yet" body="Batches appear here once a batch pilot from your college is approved." />
            ) : (
              <div className={`${surface} ${divider}`}>
                {visibleBatches.map((b) => (
                  <div key={b.id} className="px-f4 py-f3 flex items-center gap-f3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-medium truncate ${strong}`}>{batchLabel(b)}</p>
                      <p className={`text-[13px] truncate ${muted}`}>{[b.creatorName ? `Pilot: ${b.creatorName}` : '', `${b.members} ${b.members === 1 ? 'member' : 'members'}`].filter(Boolean).join(' · ')}</p>
                    </div>
                    {b.inviteCode && <span className={`shrink-0 font-mono text-[13px] font-semibold px-2 h-7 inline-flex items-center border border-line ${strong}`}>{b.inviteCode}</span>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {composerOpen && (
        <CampaignComposer
          editing={!!editingId}
          form={form}
          setForm={setForm}
          onClose={() => setComposerOpen(false)}
          onSave={save}
          reach={reach}
          totalStudents={students.length}
          collegeOptions={[]}
          branchOptions={branchOptions}
          collegeQuery=""
          setCollegeQuery={() => {}}
          collegeSuggestions={[]}
          isSearchingColleges={false}
          lockedCollege={data.college}
          allowPush
          pushAlreadySent={!!editing?.pushSentAt}
        />
      )}

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="Delete this notice?"
        description="Students will stop seeing it. This can't be undone."
        highlightText={toDelete?.title}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
