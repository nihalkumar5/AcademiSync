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

    // Explicit Sample run (e.g. from demo button)
    const isSampleRun = !!(isSample || (imageList.length === 0 && (fileName?.includes('Sample') || fileName?.includes('IIITNR'))));

    if (isSampleRun && imageList.length === 0) {
      const defaultData = [
        {
          day: 'Monday',
          startTime: '09:00',
          endTime: '10:00',
          subjectName: 'Machine Learning',
          subjectCode: 'CS302',
          room: 'LT-1',
          faculty: 'Dr. Debanjan Sadhukhan',
          isLab: false,
        },
        {
          day: 'Monday',
          startTime: '10:00',
          endTime: '11:00',
          subjectName: 'Data Engineering',
          subjectCode: 'CS304',
          room: 'LT-2',
          faculty: 'Dr. Ruhul Amin',
          isLab: false,
        },
        {
          day: 'Monday',
          startTime: '11:15',
          endTime: '12:15',
          subjectName: 'Computer Networks',
          subjectCode: 'CS306',
          room: 'LT-1',
          faculty: 'Dr. Vivek Tiwari',
          isLab: false,
        },
        {
          day: 'Monday',
          startTime: '14:00',
          endTime: '16:00',
          subjectName: 'Machine Learning Lab',
          subjectCode: 'CS382',
          room: 'AI Lab',
          faculty: 'Dr. Debanjan Sadhukhan',
          isLab: true,
        },
        {
          day: 'Tuesday',
          startTime: '09:00',
          endTime: '10:00',
          subjectName: 'Digital Signal Processing',
          subjectCode: 'EC302',
          room: 'Room 204',
          faculty: 'Dr. Shrivishal Tripathi',
          isLab: false,
        },
        {
          day: 'Tuesday',
          startTime: '14:00',
          endTime: '16:00',
          subjectName: 'Data Engineering Lab',
          subjectCode: 'CS384',
          room: 'Computing Lab 1',
          faculty: 'Dr. Ruhul Amin',
          isLab: true,
        },
      ];

      return NextResponse.json({
        success: true,
        sessions: defaultData,
        source: 'Sample Timetable Demo',
      });
    }

    // If an image was uploaded, run multimodal vision extraction across active Gemini models
    if (apiKey && imageList.length > 0) {
      const candidateModels = [
        'gemini-3.5-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.1-flash-lite-preview',
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-flash-latest',
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

      const prompt = `You are a world-class university timetable parsing assistant specializing in complex Indian engineering timetables (IITs, NITs, IIITs, Central/State Universities).
Analyze the provided timetable document(s)/image(s)/PDF and extract all weekly lecture, tutorial, and lab class sessions into a strict single JSON array.
${contextPromptBlock}
CRITICAL INSTRUCTIONS FOR TARGET FILTERING & RESOLUTION:

1. TARGET BRANCH, GROUP & SECTION ISOLATION (ZERO-REDUNDANCY GUARANTEE):
- When the document contains master schedules across multiple departments (e.g. AE, BSBE, CE, CHE, CHM, CSE, EE, ME, MSE, MTH, PHY, SDS), groups (Group 1 vs Group 2), or sections (A, B, C or A1-A10):
  * Filter STRICTLY for classes applicable to the TARGET STUDENT's Branch, Semester, and Section/Group.
  * Cross-reference department course mappings (e.g. if student is in CSE, include PHY114 and exclude PHY112, PHY113, PHY115).
  * If student is in Group 1, extract Group 1 schedule and ignore Group 2 schedule.
  * NO OVERLAPPING SESSIONS / MULTI-SECTION REDUNDANCY:
    - A student attends only ONE class at a time. NEVER extract simultaneous classes from multiple sections (e.g. do NOT output Sec A and Sec B and Sec C classes simultaneously).
    - If the student specified a Section/Batch (e.g. "A", "Sec A", "A3"), match that section only and discard all other sections.
    - If the student did NOT specify a section, default to Section A / Group 1 (the primary routine). DO NOT dump all sections together!
    - For parallel sub-batches in labs/tutorials (e.g. Lab Batch A1, A2, A3 scheduled at the same time), extract only ONE lab session for the student's sub-batch (default to A1 if unspecified). NEVER output 2 or more overlapping lab sessions at the exact same hour!
  * DO NOT output classes for departments or groups that do not belong to the target student.

2. SLOT-PATTERN MATRIX RESOLUTION (IIT Bombay / Slot System Style):
- If the document provides a Course Table with Slot Identifiers (e.g., Slot 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, L1, L2, L3, L4, LX) AND a separate Slot Pattern Grid/Matrix mapping slots to days & times (e.g., 1A on Mon 9:30-10:25, 1B on Tue 9:30-10:25, 1C on Thu 9:30-10:25):
  * NEVER output "Slot 1" as the day or time!
  * You MUST resolve each course's slot into actual Days, Start Times, and End Times by cross-referencing the Slot Pattern Grid.
  * Example: If "CS 348" is in Slot "1", output 3 separate session entries:
    - Monday 09:30 - 10:25
    - Tuesday 09:30 - 10:25
    - Thursday 09:30 - 10:25
  * For Lab slots (e.g. L1, L2, L3, L4, LX), look up the Lab Schedule table (e.g., Monday 14:00 - 16:55 for L1) and output the session with isLab: true.
  * If the student provided Specific Target Courses, extract only those courses. If none are specified, extract all courses for the target student's branch/semester.

3. SUBJECT NAME & ABBREVIATIONS:
- Look for course abbreviations and titles (e.g. "ML", "CNS", "PS", "Operating Systems", "CS 347").
- Check bottom/side legends or reference tables mapping short codes to full subject names.
- If a slot contains an abbreviation (e.g. "PS" or "DSA"), use the expanded name or standard title.
- NEVER return generic placeholders like "Subject" or "Lecture". Always put the real subject title or course code.
- If multiple courses share a slot with slashes (e.g. "CS 409 / CS 6011"), extract the specific course details.

4. CRITICAL ACADEMIC TIME & AM/PM LOGIC (STRICT 24-HOUR FORMAT "HH:MM"):
- In college and university timetables, classes operate ONLY between 08:00 AM and 07:00 PM (08:00 to 19:00).
- TIMETABLES OFTEN OMIT "PM" FOR AFTERNOON PERIODS:
  Timetable grids often label columns or slots as "02:00 - 03:00", "03:00 - 04:00", "04:00 - 05:00", or "2:00 - 3:55".
  * CRITICAL: College students do NOT attend classes at 2:00 AM, 3:00 AM, 4:00 AM, or 5:00 AM in the middle of the night!
  * You MUST convert all afternoon/evening hours (1, 2, 3, 4, 5, 6, 7) into 24-hour PM format:
    - 01:00 / 1:00 PM -> "13:00"
    - 02:00 / 2:00 PM -> "14:00"
    - 03:00 / 3:00 PM -> "15:00"
    - 04:00 / 4:00 PM -> "16:00"
    - 05:00 / 5:00 PM -> "17:00"
    - 06:00 / 6:00 PM -> "18:00"
    - 07:00 / 7:00 PM -> "19:00"
  * Morning hours (08:00, 09:00, 10:00, 11:00) are AM:
    - 08:00 AM -> "08:00"
    - 09:00 AM -> "09:00"
    - 10:00 AM -> "10:00"
    - 11:00 AM -> "11:00"
  * 12:00 is 12:00 PM (Noon): "12:00".
  * If a class is "11:00 - 01:00" or "11:00 - 1:00", the end time is 1:00 PM -> "13:00".
  * If a class is "02:00 - 03:55", start time is "14:00" and end time is "15:55".
  * If a class is "03:00 - 03:55", start time is "15:00" and end time is "15:55".
  * If a class is "04:00 - 04:55", start time is "16:00" and end time is "16:55".
  * NEVER return morning times like "02:00", "03:00", "04:00", "05:00" for daytime afternoon classes!

5. EXACT DATA SCHEMA:
For every extracted class session, return:
- "day": "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", or "Sunday"
- "startTime": 24-hour format "HH:MM" (e.g. "09:00", "14:00", "15:00", "16:00")
- "endTime": 24-hour format "HH:MM" (e.g. "10:00", "15:55", "16:55", "17:55")
- "subjectName": Specific subject name (e.g. "Computer Networks", "Operating Systems")
- "subjectCode": Course code if present (e.g. "CS 348", "PHY114", "CS 347")
- "room": Room / Hall / Venue (e.g. "LA 002", "CC 105", "SL-1-2-3", "LT-1")
- "faculty": Faculty name if visible (e.g. "Prof. Bhaskaran Raman")
- "isLab": boolean (true for practical/lab sessions, else false)

Return ONLY raw valid JSON array:
[
  {
    "day": "Monday",
    "startTime": "09:30",
    "endTime": "10:25",
    "subjectName": "Computer Networks",
    "subjectCode": "CS 348",
    "room": "LA 002",
    "faculty": "Prof. Bhaskaran Raman",
    "isLab": false
  }
]`;

      const imageParts = imageList.map((img: any) => ({
        inlineData: {
          data: img.base64.replace(/^data:[^;]+;base64,/, ''),
          mimeType: img.mimeType || 'image/jpeg',
        },
      }));

      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result: any = await Promise.race([
            model.generateContent([prompt, ...imageParts]),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Model ${modelName} timeout`)), 18000))
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
              return {
                day: s.day || 'Monday',
                startTime: start24,
                endTime: end24,
                subjectName: (s.subjectName || '').trim() || 'Subject',
                subjectCode: (s.subjectCode || '').trim(),
                room: (s.room || '').trim(),
                faculty: (s.faculty || '').trim(),
                isLab: !!s.isLab || /lab|practical|workshop/i.test(s.subjectName || '') || /lab|practical|workshop/i.test(s.subjectCode || ''),
              };
            });
            const merged = mergeConsecutiveSessions(sanitized);
            return NextResponse.json({
              success: true,
              sessions: merged,
              source: fileName || `Gemini Vision OCR (${modelName})`,
            });
          }
        } catch (modelErr: any) {
          logServerError(`ExtractTimetableAPI:${modelName}`, modelErr);
          lastError = modelErr;
        }
      }

      if (lastError) {
        logServerError('ExtractTimetableAPI:AllModelsFailed', lastError);
      }
    }

    // If we reach here, extraction was unsuccessful for the uploaded file
    return NextResponse.json(
      { 
        success: false, 
        error: 'Could not extract timetable from this document. This can happen due to a weak internet connection, unreadable/blurry photo, or AI timeout. Please check your connection, upload a clearer photo, or add classes manually.' 
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
