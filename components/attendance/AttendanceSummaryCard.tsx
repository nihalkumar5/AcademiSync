'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, BarChart3 } from '@/components/ui/icons';
import { useApp } from '@/context/AppContext';
import { fetchAllAttendance, summarizeAttendance } from '@/lib/attendance';

// Profile → Attendance: three headline numbers and the way into the Attendance center.
export const AttendanceSummaryCard: React.FC = () => {
  const { user } = useApp();
  const [summary, setSummary] = useState<ReturnType<typeof summarizeAttendance> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    fetchAllAttendance()
      .then((d) => alive && setSummary(summarizeAttendance(d.rosters, d.sessions)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const avg = summary && !isNaN(summary.avg) ? Math.round(summary.avg) : null;
  const low = summary ? summary.low.length : null;

  return (
    <Link href="/attendance" className="card group block overflow-hidden transition-colors hover:border-line-strong">
      {user ? (
        <div className="grid grid-cols-3 divide-x divide-line-soft">
          <Stat label="Lectures" value={summary ? String(summary.lectures) : '—'} />
          <Stat label="Average" value={avg === null ? '—' : String(avg)} unit={avg === null ? undefined : '%'} alert={avg !== null && avg < 75}>
            <span className="mt-f3 block h-[3px] w-full bg-surface-3" aria-hidden="true">
              <span
                className={`block h-full transition-[width] duration-700 ${avg !== null && avg < 75 ? 'bg-danger' : 'bg-ink'}`}
                style={{ width: `${avg ?? 0}%` }}
              />
            </span>
          </Stat>
          <Stat label="Below 75%" value={low === null ? '—' : String(low)} alert={!!low} hint={low === null ? undefined : low === 1 ? 'student' : 'students'} />
        </div>
      ) : (
        <p className="px-f4 py-f4 text-[14px] text-muted">Sign in to keep attendance records on your account.</p>
      )}
      <div className="sheen-ink flex items-center gap-f3 px-f4 min-h-[60px] bg-ink text-on-ink">
        <BarChart3 className="w-5 h-5 shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold">Attendance center</span>
          <span className="block text-[13px] opacity-65 truncate">
            {failed ? "Couldn't load numbers — open to retry" : 'Full history, every student, trends and export'}
          </span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0 opacity-70 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
};

const Stat: React.FC<{ label: string; value: string; unit?: string; hint?: string; alert?: boolean; children?: React.ReactNode }> = ({
  label,
  value,
  unit,
  hint,
  alert,
  children,
}) => (
  <div className="px-f4 pt-f4 pb-f4 min-w-0">
    <p className="text-[13px] text-muted">{label}</p>
    <p className={`mt-f2 flex items-baseline gap-0.5 tabular-nums leading-none tracking-tight ${alert ? 'text-danger' : 'text-fg'}`}>
      <span className="text-[36px] font-medium">{value}</span>
      {unit && <span className="text-[18px] font-medium opacity-60">{unit}</span>}
    </p>
    {hint && <p className="mt-f2 text-[12px] text-muted">{hint}</p>}
    {children}
  </div>
);
