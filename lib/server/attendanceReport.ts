// Builds the attendance Excel report (.xlsx). Pure: data in, file bytes out — no database access,
// so it can be tested on its own. Layout follows how institutions keep registers:
//   Summary · Students (per batch) · Register (per batch, lecture-by-lecture P/A) · Lectures · Change log
// Colour only carries meaning: absent / below-75% in red, OK in green; everything else ink on white.
import ExcelJS from 'exceljs';
import {
  AttendanceSession,
  AuditEntry,
  LOW_PCT,
  MIN_LECTURES_FOR_FLAG,
  Roster,
  RosterStudent,
  byRoll,
  isAtRisk,
  studentStats,
} from '../attendanceShared';

export interface ReportBatch {
  batchKey: string;
  label: string;
  roster: Roster;
  sessions: AttendanceSession[]; // already filtered to the period/subject
}

export interface ReportInput {
  facultyName: string;
  facultyEmail?: string;
  institution?: string;
  department?: string;
  subject?: string;
  periodLabel: string;
  generatedAt: Date;
  timeZone: string;
  batches: ReportBatch[];
  audit: AuditEntry[];
}

const INK = 'FF111111';
const MUTED = 'FF6B6B6B';
const LINE = 'FFD9D9D6';
const BAD_FILL = 'FFFDE4E4';
const BAD_TEXT = 'FFB42318';
const OK_FILL = 'FFE7F6EC';
const OK_TEXT = 'FF067647';
const SOFT = 'FFF4F4F2';

const thin = { style: 'thin' as const, color: { argb: LINE } };
const box = { top: thin, left: thin, bottom: thin, right: thin };

const fmt = (iso: string | undefined, tz: string, withTime = true) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { timeZone: tz, day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}) });
};
const dayKeyLabel = (key: string) => {
  const d = new Date(`${key}T00:00:00Z`);
  return isNaN(d.getTime()) ? key : d.toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
};
const weekday = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'short' });
const time12 = (t: string) => {
  if (/[ap]m/i.test(t)) return t.toUpperCase();
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  if (isNaN(h)) return t;
  return `${((h + 11) % 12) + 1}:${String(isNaN(m) ? 0 : m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const chrono = (a: AttendanceSession, b: AttendanceSession) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
const pct = (num: number, den: number) => (den ? num / den : null);

// Excel sheet names: ≤31 chars, no []:*?/\ and unique
const sheetName = (wb: ExcelJS.Workbook, raw: string) => {
  const base = raw.replace(/[\[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet';
  let name = base;
  let n = 2;
  while (wb.getWorksheet(name)) name = `${base.slice(0, 28)} ${n++}`;
  return name;
};

const styleHeader = (row: ExcelJS.Row) => {
  row.height = 22;
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
    c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    c.border = box;
  });
};
const styleBody = (row: ExcelJS.Row) => {
  row.eachCell({ includeEmpty: true }, (c) => {
    c.border = box;
    c.alignment = { vertical: 'middle', ...(c.alignment || {}) };
  });
};
const badCell = (c: ExcelJS.Cell) => {
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAD_FILL } };
  c.font = { ...(c.font || {}), bold: true, color: { argb: BAD_TEXT } };
};
const okCell = (c: ExcelJS.Cell) => {
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OK_FILL } };
  c.font = { ...(c.font || {}), color: { argb: OK_TEXT } };
};
const title = (ws: ExcelJS.Worksheet, text: string, sub: string, span: number) => {
  ws.mergeCells(1, 1, 1, Math.max(span, 2));
  const t = ws.getCell(1, 1);
  t.value = text;
  t.font = { bold: true, size: 16, color: { argb: INK } };
  ws.getRow(1).height = 26;
  ws.mergeCells(2, 1, 2, Math.max(span, 2));
  const s = ws.getCell(2, 1);
  s.value = sub;
  s.font = { size: 10, color: { argb: MUTED } };
};

/** Students in the register: the class list, plus anyone marked earlier but since removed. */
const registerStudents = (b: ReportBatch): RosterStudent[] => {
  const list = [...b.roster.students].sort(byRoll);
  const known = new Set(list.map((s) => s.key));
  const extra = new Set<string>();
  b.sessions.forEach((s) => Object.keys(s.marks || {}).forEach((k) => !known.has(k) && extra.add(k)));
  extra.forEach((k) => list.push({ key: k, name: 'Removed from class list', roll: '' }));
  return list;
};

export async function buildAttendanceWorkbook(input: ReportInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Intersemester';
  wb.lastModifiedBy = input.facultyName;
  wb.created = input.generatedAt;
  wb.modified = input.generatedAt;
  wb.title = 'Attendance report';
  wb.subject = input.batches.map((b) => b.label).join(', ');
  wb.company = input.institution || '';

  const tz = input.timeZone;
  const generated = fmt(input.generatedAt.toISOString(), tz);
  const many = input.batches.length > 1;
  const confidential = 'Confidential — contains student attendance records. Share only with authorised staff.';

  // ---------- Summary ----------
  const sum = wb.addWorksheet('Summary', { views: [{ showGridLines: false }], properties: { tabColor: { argb: INK } } });
  sum.columns = [{ width: 26 }, { width: 34 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 14 }];
  title(sum, 'Attendance report', `${input.institution ? `${input.institution} · ` : ''}Generated ${generated}`, 6);
  const meta: [string, string][] = [
    ['Faculty', input.facultyEmail ? `${input.facultyName} (${input.facultyEmail})` : input.facultyName],
    ...(input.department ? ([['Department', input.department]] as [string, string][]) : []),
    ['Batch', many ? `All batches (${input.batches.length})` : input.batches[0]?.label || '—'],
    ['Subject', input.subject || 'All subjects'],
    ['Period', input.periodLabel],
    ['Attendance rule', `Below ${LOW_PCT}% is flagged once a student has ${MIN_LECTURES_FOR_FLAG} or more lectures.`],
  ];
  let r = 4;
  meta.forEach(([k, v]) => {
    const row = sum.getRow(r++);
    row.getCell(1).value = k;
    row.getCell(1).font = { bold: true, color: { argb: MUTED } };
    sum.mergeCells(row.number, 2, row.number, 6);
    row.getCell(2).value = v;
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  });

  r += 1;
  sum.getCell(r, 1).value = 'Overview';
  sum.getCell(r, 1).font = { bold: true, size: 13 };
  r += 1;
  const ovHead = sum.getRow(r++);
  sum.mergeCells(ovHead.number, 1, ovHead.number, 2);
  ['Batch', '', 'Students', 'Lectures', 'Average attendance', `Below ${LOW_PCT}%`].forEach((h, i) => (ovHead.getCell(i + 1).value = h || null));
  styleHeader(ovHead);
  let totStudents = 0;
  let totLectures = 0;
  let totMarked = 0;
  let totAttended = 0;
  let totLow = 0;
  input.batches.forEach((b) => {
    const marked = b.sessions.reduce((a, s) => a + (s.total || 0), 0);
    const attended = b.sessions.reduce((a, s) => a + ((s.total || 0) - (s.absent || 0)), 0);
    const low = studentStats(b.roster.students, b.sessions).filter(isAtRisk).length;
    totStudents += b.roster.students.length;
    totLectures += b.sessions.length;
    totMarked += marked;
    totAttended += attended;
    totLow += low;
    const row = sum.getRow(r++);
    sum.mergeCells(row.number, 1, row.number, 2);
    row.getCell(1).value = b.label;
    row.getCell(3).value = b.roster.students.length;
    row.getCell(4).value = b.sessions.length;
    row.getCell(5).value = pct(attended, marked);
    row.getCell(5).numFmt = '0.0%';
    row.getCell(6).value = low;
    styleBody(row);
    if (low > 0) badCell(row.getCell(6));
    const avg = pct(attended, marked);
    if (avg !== null && avg < LOW_PCT / 100) badCell(row.getCell(5));
  });
  if (many) {
    const row = sum.getRow(r++);
    sum.mergeCells(row.number, 1, row.number, 2);
    row.getCell(1).value = 'Total';
    row.getCell(3).value = totStudents;
    row.getCell(4).value = totLectures;
    row.getCell(5).value = pct(totAttended, totMarked);
    row.getCell(5).numFmt = '0.0%';
    row.getCell(6).value = totLow;
    styleBody(row);
    row.eachCell((c) => (c.font = { ...(c.font || {}), bold: true }));
  }

  // By subject
  const subj = new Map<string, { label: string; subject: string; lectures: number; marked: number; att: number }>();
  input.batches.forEach((b) =>
    b.sessions.forEach((s) => {
      const k = `${b.batchKey}|${s.subjectName}`;
      const e = subj.get(k) || { label: b.label, subject: s.subjectName, lectures: 0, marked: 0, att: 0 };
      e.lectures++;
      e.marked += s.total || 0;
      e.att += (s.total || 0) - (s.absent || 0);
      subj.set(k, e);
    })
  );
  if (subj.size) {
    r += 1;
    sum.getCell(r, 1).value = 'By subject';
    sum.getCell(r, 1).font = { bold: true, size: 13 };
    r += 1;
    const h = sum.getRow(r++);
    ['Subject', 'Batch', 'Lectures', 'Average attendance'].forEach((x, i) => (h.getCell(i + 1).value = x));
    styleHeader(h);
    Array.from(subj.values())
      .sort((a, b) => a.label.localeCompare(b.label) || a.subject.localeCompare(b.subject))
      .forEach((e) => {
        const row = sum.getRow(r++);
        row.getCell(1).value = e.subject;
        row.getCell(2).value = e.label;
        row.getCell(3).value = e.lectures;
        row.getCell(4).value = pct(e.att, e.marked);
        row.getCell(4).numFmt = '0.0%';
        styleBody(row);
      });
  }
  r += 1;
  sum.mergeCells(r, 1, r, 6);
  sum.getCell(r, 1).value = confidential;
  sum.getCell(r, 1).font = { italic: true, size: 9, color: { argb: MUTED } };

  // ---------- Per batch: Students + Register ----------
  input.batches.forEach((b) => {
    const prefix = many ? `${b.label} ` : '';
    const sessions = [...b.sessions].sort(chrono);
    const subjects = Array.from(new Set(sessions.map((s) => s.subjectName))).sort();
    const students = registerStudents(b);

    // Students
    const st = wb.addWorksheet(sheetName(wb, `${prefix}Students`), { views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }] });
    const perSubject = subjects.length > 1;
    const head = ['Roll No.', 'Name', 'Lectures', 'Present', 'Absent', 'Attendance', 'Status', ...(perSubject ? subjects.map((s) => `${s} %`) : [])];
    st.columns = head.map((h, i) => ({ width: i === 0 ? 14 : i === 1 ? 30 : i === 6 ? 26 : i > 6 ? Math.min(Math.max(h.length + 2, 12), 24) : 12 }));
    title(st, `Students — ${b.label}`, `${input.subject || 'All subjects'} · ${input.periodLabel} · ${sessions.length} lectures`, head.length);
    const hr = st.getRow(4);
    head.forEach((h, i) => (hr.getCell(i + 1).value = h));
    styleHeader(hr);
    const stats = studentStats(students, sessions);
    const bySubject = perSubject ? subjects.map((sub) => studentStats(students, sessions, sub)) : [];
    stats.forEach((s, i) => {
      const row = st.getRow(5 + i);
      row.getCell(1).value = s.student.roll || '—';
      row.getCell(2).value = s.student.name;
      row.getCell(3).value = s.total;
      row.getCell(4).value = s.attended;
      row.getCell(5).value = s.absent;
      row.getCell(6).value = s.total ? s.attended / s.total : null;
      row.getCell(6).numFmt = '0.0%';
      const risk = isAtRisk(s);
      row.getCell(7).value = !s.total ? 'No lectures yet' : risk ? `Below ${LOW_PCT}%` : s.total < MIN_LECTURES_FOR_FLAG ? `Too early (${s.total}/${MIN_LECTURES_FOR_FLAG} lectures)` : 'OK';
      bySubject.forEach((list, j) => {
        const x = list[i];
        const c = row.getCell(8 + j);
        c.value = x.total ? x.attended / x.total : null;
        c.numFmt = '0.0%';
        if (isAtRisk(x)) badCell(c);
      });
      styleBody(row);
      [3, 4, 5, 6].forEach((c) => (row.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' }));
      if (risk) {
        badCell(row.getCell(6));
        badCell(row.getCell(7));
      } else if (s.total >= MIN_LECTURES_FOR_FLAG) okCell(row.getCell(7));
      else row.getCell(7).font = { color: { argb: MUTED } };
    });
    st.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + stats.length, column: head.length } };
    st.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '4:4', margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
    st.headerFooter = { oddFooter: `&L${b.label}&C${confidential}&RPage &P of &N` };

    // Register: one column per lecture, oldest → newest
    const reg = wb.addWorksheet(sheetName(wb, `${prefix}Register`), { views: [{ state: 'frozen', xSplit: 2, ySplit: 5 }] });
    const lectureCols = sessions.length;
    const lastCol = 2 + lectureCols + 3;
    reg.columns = [{ width: 14 }, { width: 28 }, ...sessions.map(() => ({ width: 7 })), { width: 10 }, { width: 9 }, { width: 12 }];
    title(reg, `Attendance register — ${b.label}`, `${input.subject || 'All subjects'} · ${input.periodLabel} · P = present, A = absent`, lastCol);
    const dRow = reg.getRow(4);
    const sRow = reg.getRow(5);
    dRow.getCell(1).value = 'Roll No.';
    dRow.getCell(2).value = 'Name';
    reg.mergeCells(4, 1, 5, 1);
    reg.mergeCells(4, 2, 5, 2);
    sessions.forEach((s, i) => {
      dRow.getCell(3 + i).value = dayKeyLabel(s.date).replace(/ \d{4}$/, '');
      sRow.getCell(3 + i).value = `${s.subjectName}\n${time12(s.startTime)}`;
    });
    ['Present', 'Total', 'Attendance'].forEach((h, i) => {
      dRow.getCell(3 + lectureCols + i).value = h;
      reg.mergeCells(4, 3 + lectureCols + i, 5, 3 + lectureCols + i);
    });
    styleHeader(dRow);
    styleHeader(sRow);
    sRow.height = 54;
    sRow.eachCell((c) => {
      c.font = { bold: false, size: 8, color: { argb: 'FFFFFFFF' } };
      c.alignment = { wrapText: true, vertical: 'top', horizontal: 'center', textRotation: 0 };
    });
    for (let c = 3; c < 3 + lectureCols; c++) dRow.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };

    students.forEach((stu, i) => {
      const row = reg.getRow(6 + i);
      row.getCell(1).value = stu.roll || '—';
      row.getCell(2).value = stu.name;
      let present = 0;
      let total = 0;
      sessions.forEach((s, j) => {
        const m = s.marks?.[stu.key] as string | undefined;
        const c = row.getCell(3 + j);
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        if (!m) {
          c.value = '–';
          c.font = { color: { argb: MUTED } };
          return;
        }
        total++;
        if (m === 'A') {
          c.value = 'A';
          badCell(c);
        } else {
          present++;
          c.value = 'P';
          c.font = { color: { argb: INK } };
        }
      });
      row.getCell(3 + lectureCols).value = present;
      row.getCell(4 + lectureCols).value = total;
      const p = row.getCell(5 + lectureCols);
      p.value = total ? present / total : null;
      p.numFmt = '0.0%';
      styleBody(row);
      if (isAtRisk({ pct: total ? (present / total) * 100 : NaN, total })) badCell(p);
    });
    // Class attendance per lecture
    const foot = reg.getRow(6 + students.length);
    foot.getCell(1).value = 'Class';
    foot.getCell(2).value = 'Present in lecture';
    sessions.forEach((s, j) => {
      const c = foot.getCell(3 + j);
      c.value = s.total ? (s.total - s.absent) / s.total : null;
      c.numFmt = '0%';
      c.alignment = { horizontal: 'center' };
    });
    styleBody(foot);
    foot.eachCell((c) => {
      c.font = { ...(c.font || {}), bold: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };
    });
    reg.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '4:5', printTitlesColumn: 'A:B', margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } };
    reg.headerFooter = { oddFooter: `&L${b.label}&C${confidential}&RPage &P of &N` };
  });

  // ---------- Lectures ----------
  const lec = wb.addWorksheet('Lectures', { views: [{ state: 'frozen', ySplit: 4 }] });
  const lHead = [...(many ? ['Batch'] : []), 'Date', 'Day', 'Time', 'Subject', 'Present', 'Absent', 'Total', 'Attendance', 'Marked at', 'Last changed', 'Edits'];
  lec.columns = lHead.map((h) => ({ width: h === 'Batch' ? 26 : h === 'Subject' ? 28 : h === 'Marked at' || h === 'Last changed' ? 22 : h === 'Date' ? 14 : 11 }));
  title(lec, 'Lectures', `${input.subject || 'All subjects'} · ${input.periodLabel}`, lHead.length);
  const lh = lec.getRow(4);
  lHead.forEach((h, i) => (lh.getCell(i + 1).value = h));
  styleHeader(lh);
  let lr = 5;
  input.batches.forEach((b) =>
    [...b.sessions].sort(chrono).forEach((s) => {
      const row = lec.getRow(lr++);
      const vals = [
        ...(many ? [b.label] : []),
        dayKeyLabel(s.date),
        weekday(s.date),
        time12(s.startTime),
        s.subjectName,
        (s.total || 0) - (s.absent || 0),
        s.absent || 0,
        s.total || 0,
        s.total ? ((s.total || 0) - (s.absent || 0)) / s.total : null,
        fmt(s.takenAt, tz),
        fmt(s.updatedAt, tz),
        Math.max((s.version || 1) - 1, 0),
      ];
      vals.forEach((v, i) => (row.getCell(i + 1).value = v as any));
      const pc = row.getCell(lHead.indexOf('Attendance') + 1);
      pc.numFmt = '0.0%';
      styleBody(row);
      if (s.total && (s.total - s.absent) / s.total < LOW_PCT / 100) badCell(pc);
    })
  );
  lec.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(lr - 1, 4), column: lHead.length } };
  lec.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '4:4' };

  // ---------- Change log ----------
  const log = wb.addWorksheet('Change log', { views: [{ state: 'frozen', ySplit: 4 }] });
  const gHead = ['When', ...(many ? ['Batch'] : []), 'What', 'Lecture', 'Details', 'By'];
  log.columns = gHead.map((h) => ({ width: h === 'Details' ? 60 : h === 'When' ? 22 : h === 'Lecture' ? 32 : h === 'Batch' ? 26 : h === 'By' ? 28 : 18 }));
  title(log, 'Change log', 'Every save, edit, delete, restore and export — written by the server and not editable.', gHead.length);
  const gh = log.getRow(4);
  gHead.forEach((h, i) => (gh.getCell(i + 1).value = h));
  styleHeader(gh);
  const labelOf = new Map(input.batches.map((b) => [b.batchKey, b.label]));
  const actionText: Record<string, string> = {
    'roster.lock': 'Class list locked',
    'roster.update': 'Class list changed',
    'session.create': 'Lecture marked',
    'session.update': 'Lecture edited',
    'session.delete': 'Lecture deleted',
    'session.restore': 'Lecture restored',
    'report.export': 'Report downloaded',
  };
  [...input.audit]
    .sort((a, b) => b.ts - a.ts)
    .forEach((e, i) => {
      const row = log.getRow(5 + i);
      const changes = (e.changes || [])
        .slice(0, 40)
        .map((c) => `${c.roll || c.name || c.key}: ${c.from ? `${c.from}→` : ''}${c.to}`)
        .join('; ');
      const more = (e.changes?.length || 0) > 40 ? ` (+${(e.changes?.length || 0) - 40} more)` : '';
      const vals = [
        fmt(e.at, tz),
        ...(many ? [labelOf.get(e.batchKey) || e.batchKey] : []),
        actionText[e.action] || e.action,
        e.subjectName ? `${e.subjectName} · ${e.date ? dayKeyLabel(e.date) : ''}${e.startTime ? ` · ${time12(e.startTime)}` : ''}` : '',
        `${e.summary}${changes ? ` — ${changes}${more}` : ''}`,
        e.byEmail || e.by,
      ];
      vals.forEach((v, j) => (row.getCell(j + 1).value = v));
      styleBody(row);
      row.getCell(gHead.indexOf('Details') + 1).alignment = { wrapText: true, vertical: 'top' };
      if (e.action === 'session.delete') badCell(row.getCell(gHead.indexOf('What') + 1));
    });
  log.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '4:4' };

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

/** Safe, readable file name: Attendance_MTech-CSE-Sem-1_2026-11-01_to_2026-11-30.xlsx */
export const reportFileName = (label: string, from?: string, to?: string) => {
  const clean = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'All';
  const range = from || to ? `_${from || 'start'}_to_${to || 'today'}` : '';
  return `Attendance_${clean(label)}${range}.xlsx`;
};
