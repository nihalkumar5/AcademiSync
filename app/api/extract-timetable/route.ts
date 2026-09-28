import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { mergeConsecutiveSessions } from '@/lib/timetableUtils';
import { logServerError } from '@/lib/errorUtils';
import { validateServerUploadPayload } from '@/lib/fileSafety';
import { checkAiRateLimit } from '@/lib/rateLimit';

const clean24HourTime = (str?: string, fallback = '09:00'): string => {
  if (!str) return fallback;
  const full = str.trim();
  let single = full;
  if (single.includes('-')) {
    single = single.split('-')[0].trim();
  } else if (single.toLowerCase().includes(' to ')) {
    single = single.toLowerCase().split(' to ')[0].trim();
  }

  const hasPM = /pm/i.test(single) || /pm/i.test(full);
  const hasAM = /am/i.test(single) || (/am/i.test(full) && !hasPM);

  const match = single.match(/(\d{1,2})[:.](\d{2})/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);

    if (hasPM && h < 12) {
      h += 12;
    } else if (hasAM && h === 12) {
      h = 0;
    } else if (!hasAM && h >= 1 && h <= 7) {
      // In college timetables, hours 1:00 to 7:00 are strictly afternoon/evening PM (13:00 - 19:00)
      h += 12;
    }

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const hourOnly = single.match(/(\d{1,2})/);
  if (hourOnly) {
    let h = parseInt(hourOnly[1], 10);
    if (hasPM && h < 12) h += 12;
    else if (hasAM && h === 12) h = 0;
    else if (!hasAM && h >= 1 && h <= 7) h += 12;
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, '0')}:00`;
    }
  }

  return fallback;
};

const clean24HourEndTime = (endStr?: string, startStr?: string, fallback = '10:00'): string => {
  if (!endStr) return fallback;
  const full = endStr.trim();
  let single = full;
  if (single.includes('-')) {
    single = single.split('-')[1].trim();
  } else if (single.toLowerCase().includes(' to ')) {
    single = single.toLowerCase().split(' to ')[1].trim();
  }

  const hasPM = /pm/i.test(single) || /pm/i.test(full) || (startStr && /pm/i.test(startStr));
  const hasAM = /am/i.test(single) || (/am/i.test(full) && !hasPM);

  const match = single.match(/(\d{1,2})[:.](\d{2})/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);

    if (hasPM && h < 12) {
      h += 12;
    } else if (hasAM && h === 12) {
      h = 0;
    } else if (!hasAM && h >= 1 && h <= 7) {
      h += 12;
    } else if (startStr) {
      const startH = parseInt(startStr.split(':')[0], 10);
      if (startH >= 12 && h < 12) {
        h += 12;
      }
    }

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return clean24HourTime(single, fallback);
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { images, imageBase64, mimeType, fileName, userId, isSample, studentContext } = body;
    const clientUserId = userId || req.headers.get('x-user-id') || null;

    // Campus-Safe AI Rate Limiter Guard
    const rateCheck = checkAiRateLimit(req, clientUserId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: rateCheck.error || 'Rate limit exceeded. Please wait a few minutes before scanning again.' },
        { 
          status: 429, 
          headers: rateCheck.retryAfterSeconds ? { 'Retry-After': String(rateCheck.retryAfterSeconds) } : undefined 
        }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // Handle both legacy single image or new multi-image format
    const imageList = images || (imageBase64 ? [{ base64: imageBase64, mimeType }] : []);

    // File Upload Safety Validation
    if (imageList.length > 0) {
      const validation = validateServerUploadPayload(imageList);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.error || 'Invalid file uploaded.' },
          { status: 400 }
        );
      }
    }

    if (!imageList || imageList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No timetable document or image provided.' },
        { status: 400 }
      );
    }

    let lastError: any = null;

    // If an image was uploaded, run multimodal vision extraction across active Gemini models
    if (apiKey && imageList.length > 0) {
      const candidateConfigs = [
        { name: 'gemini-flash-lite-latest', timeoutMs: 16000 },
        { name: 'gemini-3.5-flash-lite', timeoutMs: 16000 },
        { name: 'gemini-flash-latest', timeoutMs: 25000 },
        { name: 'gemini-3.8-flash', timeoutMs: 25000 },
      ];
      const genAI = new GoogleGenerativeAI(apiKey);

      const contextLines: string[] = [];
      if (studentContext) {
        if (studentContext.college) contextLines.push(`- Target College: ${studentContext.college}`);
        if (studentContext.programme) contextLines.push(`- Target Programme: ${studentContext.programme}`);
        if (studentContext.branch) contextLines.push(`- Target Branch/Department: ${studentContext.branch}`);
        if (studentContext.semester) contextLines.push(`- Target Semester: ${studentContext.semester}`);
        if (studentContext.section) contextLines.push(`- Target Section/Group/Batch: ${studentContext.section}`);
        if (studentContext.targetCourses) contextLines.push(`- Specific Target Courses Filter: ${studentContext.targetCourses}`);
      }
      const contextPromptBlock = contextLines.length > 0 
        ? `\nTARGET STUDENT PROFILE & CONTEXT:\n${contextLines.join('\n')}\n` 
        : '';

      const prompt = `You are a universal, world-class university timetable parser specializing in ALL styles of Indian college and university timetables (IITs, NITs, IIITs, Central/State Universities, AKTU, VTU, Anna Univ, MAKAUT, Mumbai Univ, and private institutes like BITS, VIT, SRM, Amity, etc.).
Analyze the provided timetable document(s)/image(s)/PDF and extract all weekly lecture, tutorial, and lab class sessions into a strict single JSON array.
${contextPromptBlock}
UNIVERSAL FORMAT HANDLING DIRECTIVES:

1. SUPPORT FOR ALL TIMETABLE LAYOUTS & STYLES:
- STYLE A: SLOT-BASED ROUTINES WITH MAPPING LEGEND (IITs, NITs, IIITs):
  * Grid contains slot codes (e.g. 'A', 'B', 'Z', 'L', 'P', 'F', 'E', '1', '2') or subject names ('Music', 'Yoga', 'ILC').
  * Look up each slot/name in the Faculty / Subject reference table (at bottom or side) to resolve:
    - Full Subject Name (e.g. Slot L -> "Digital Electronics using Verilog")
    - Faculty Name (e.g. Slot L -> "Dr. Manoj", Slot Z -> "Dr. Jaya Rahod", "Music" -> "Dr. Darash", "Yoga" -> "GF")
    - Clean Course Code abbreviation (e.g. "DEV", "CALC", "PWC", "LAMA", "IOT", "ITW", "ENT", "ILC/Yoga"). Never output single-letter slots like "L" or "Z" as subjectCode.

- STYLE B: DIRECT IN-CELL ROUTINES (AKTU, VTU, State Colleges, Private Univs):
  * Grid cells directly contain 2-4 lines of text:
    Line 1: Subject Name / Code (e.g. "Operating Systems" or "KCS-501")
    Line 2: Faculty Name or Initials (e.g. "Dr. P. Roy", "Prof. Verma", "AKS")
    Line 3: Room / Hall (e.g. "CR-201", "LT-3", "Lab-2")
  * Extract subject, faculty, and room directly from inside the cell!
  * If the cell contains Faculty Initials (e.g. "AKS") and a Faculty Initials expansion table exists on the sheet (e.g. "AKS: Dr. Ashok Kumar Sharma"), expand it to the full name. Otherwise, keep the teacher's name/initials as written.

- STYLE C: MULTI-SECTION / MASTER DEPARTMENT SHEETS (DTU, NSUT, NITs, Univ Campuses):
  * Timetable displays routines for multiple sections (Sec A, B, C) or branches (CSE, ECE, ME).
  * Filter STRICTLY for classes applicable to the target student's branch and section.
  * If the student specified Section A, extract Section A and ignore other sections. If unspecified, default to Section A / Group 1. Never dump multiple sections together into overlapping time clashes!

- STYLE D: INVERTED GRIDS & TABULAR LISTS:
  * Inverted grids: Days on columns (X-axis: Mon-Fri), Times on rows (Y-axis).
  * Standard grids: Days on rows (Y-axis: Mon-Fri), Times on columns (X-axis).
  * Tabular lists: Row-by-row table (Day | Period | Time | Subject | Faculty | Room).
  * Read coordinate headers carefully so every class is placed on the exact correct Day and Time!

2. ACCURATE PERIOD TIMINGS & AM/PM LOGIC (STRICT 24-HOUR FORMAT "HH:MM"):
- Read the exact start and end times from the period header columns/rows (e.g. 09:00-09:55, 10:00-10:55, 11:00-12:00, 14:00-14:55).
- In college schedules, classes run strictly between 08:00 AM and 07:00 PM (08:00 to 19:00).
- Convert afternoon/evening hours (1, 2, 3, 4, 5, 6, 7) into 24-hour PM format:
  * 01:00 PM -> "13:00" | 02:00 PM -> "14:00" | 03:00 PM -> "15:00" | 04:00 PM -> "16:00" | 05:00 PM -> "17:00"
- Morning hours (08:00, 09:00, 10:00, 11:00) are AM ("08:00", "09:00", "10:00", "11:00").
- 12:00 is 12:00 PM Noon ("12:00").
- If a class/lab spans a multi-hour block (e.g. "02:00 - 05:00" or "11:00 - 01:00"), extract startTime as "14:00" and endTime as "17:00" (or "11:00" to "13:00").

3. UNIVERSAL BREAK / LUNCH RECOGNITION (ZERO-CLASH DIRECTIVE):
- In ANY timetable, columns or rows marked Lunch, Break, Recess, Interval, Tea, T-E-A, or vertical letters like 'L-U-N-C-H' or 'R-E-C-E-S-S' are rest periods.
- NEVER interpret lunch/recess letters or columns as classes!
- For instance, the letter 'L' in an interval/lunch column (e.g. '1 - 2') is the 'L' of LUNCH, NOT a class! Never output a class for the lunch hour.

4. PRESERVE SLASH / OBLIQUE NOTATION VERBATIM:
- When a cell contains a slash/oblique (e.g. "ILC/Yoga" or "Lab A / Lab B" or "Course 1 / Course 2"):
  * Keep it EXACTLY as written: "ILC/Yoga".
  * Both "subjectName" and "subjectCode" must keep the slash.
  * If faculty are listed for both, combine with slash: "Dr. Aruna / GF".

5. ROOM EXTRACTION:
- Extract room from the sheet header (e.g. "Room No 138" -> "138"), from inside each cell (e.g. "LT-2", "Lab 4"), or from the legend table.

6. EXACT DATA SCHEMA:
For every extracted class session, return:
- "day": "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", or "Sunday"
- "startTime": 24-hour format "HH:MM" (e.g. "09:00", "10:00", "11:00", "14:00", "15:00", "16:00")
- "endTime": 24-hour format "HH:MM" (e.g. "09:55", "10:55", "11:55", "14:55", "15:55", "16:55")
- "subjectName": Full subject name (e.g. "Digital Electronics using Verilog", "Operating Systems", "Music", "ILC/Yoga")
- "subjectCode": Course code or clean abbreviation (e.g. "CS301", "DEV", "CALC", "Music", "ILC/Yoga")
- "room": Room / Hall / Lab number (e.g. "138", "LT-1", "Lab 2")
- "faculty": Faculty name (e.g. "Dr. Manoj", "Dr. Jaya Rahod", "Prof. R. Gupta", "Dr. Aruna / GF")
- "isLab": boolean (true for practical/lab sessions, else false)
- "isElective": boolean (true if elective, else false)

Return ONLY raw valid JSON array:
[
  {
    "day": "Monday",
    "startTime": "09:00",
    "endTime": "09:55",
    "subjectName": "Music",
    "subjectCode": "Music",
    "room": "138",
    "faculty": "Dr. Darash",
    "isLab": false,
    "isElective": false
  }
]`;

      const imageParts = imageList.map((img: any) => ({
        inlineData: {
          data: img.base64.replace(/^data:[^;]+;base64,/, ''),
          mimeType: img.mimeType || 'image/jpeg',
        },
      }));

      lastError = null;

      for (const config of candidateConfigs) {
        try {
          const model = genAI.getGenerativeModel({
            model: config.name,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          });
          const result: any = await Promise.race([
            model.generateContent([prompt, ...imageParts]),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Model ${config.name} timeout`)), config.timeoutMs))
          ]);
          const responseText = result.response.text();
          let jsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const firstBracket = jsonStr.indexOf('[');
          const lastBracket = jsonStr.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
          }
          const parsed = JSON.parse(jsonStr);

          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = parsed.map((s: any) => {
              const start24 = clean24HourTime(s.startTime, '09:00');
              const end24 = clean24HourEndTime(s.endTime, s.startTime, '10:00');
              const isElective = !!s.isElective || 
                /elective/i.test(s.subjectName || '') || 
                /elective/i.test(s.subjectCode || '') ||
                /elec/i.test(s.subjectCode || '');
              return {
                day: s.day || 'Monday',
                startTime: start24,
                endTime: end24,
                subjectName: (s.subjectName || '').trim() || 'Subject',
                subjectCode: (s.subjectCode || '').trim(),
                room: (s.room || '').trim(),
                faculty: (s.faculty || '').trim(),
                isLab: !!s.isLab || /lab|practical|workshop/i.test(s.subjectName || '') || /lab|practical|workshop/i.test(s.subjectCode || ''),
                isElective,
              };
            });
            const merged = mergeConsecutiveSessions(sanitized);
            return NextResponse.json({
              success: true,
              sessions: merged,
              source: fileName || `Gemini Vision OCR (${config.name})`,
            });
          }
        } catch (modelErr: any) {
          logServerError(`ExtractTimetableAPI:${config.name}`, modelErr);
          lastError = modelErr;
        }
      }

      if (lastError) {
        logServerError('ExtractTimetableAPI:AllModelsFailed', lastError);
      }
    }

    const isQuotaOrBusy = lastError?.message && (
      lastError.message.includes('429') || 
      lastError.message.includes('quota') || 
      lastError.message.includes('503') ||
      lastError.message.includes('demand')
    );

    // If we reach here, extraction was unsuccessful for the uploaded file
    return NextResponse.json(
      { 
        success: false, 
        error: isQuotaOrBusy
          ? 'AI vision service is experiencing high demand right now. Please wait a few moments and try again, or enter your routine manually.'
          : 'Could not extract timetable from this document. Please ensure the image or PDF is sharp and clear, or enter routine details manually.'
      },
      { status: 422 }
    );
  } catch (error) {
    logServerError('ExtractTimetableAPI:Unhandled', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process timetable document. Please check your connection and try again.' },
      { status: 500 }
    );
  }
}
