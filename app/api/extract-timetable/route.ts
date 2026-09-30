import { NextResponse } from 'next/server';
import OpenAI from 'openai';
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

/**
 * Extracts timetable sessions using OpenAI Vision models (gpt-4o / gpt-4o-mini)
 */
async function extractTimetableWithOpenAI(
  apiKey: string,
  modelName: string,
  prompt: string,
  imageList: Array<{ base64: string; mimeType?: string }>
): Promise<any[]> {
  const openai = new OpenAI({ apiKey });

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: 'text',
      text: `${prompt}\n\nCRITICAL JSON SCHEMA REQUIREMENT:\nYou MUST return a JSON object with a "sessions" key containing an array of timetable sessions:\n{\n  "sessions": [\n    {\n      "day": "Monday",\n      "startTime": "09:00",\n      "endTime": "09:55",\n      "subjectName": "Computer Networks",\n      "subjectCode": "CS301",\n      "room": "LA 101",\n      "faculty": "Prof. Sharma",\n      "isLab": false,\n      "isElective": false\n    }\n  ]\n}`,
    },
    ...imageList.map((img) => {
      const mime = img.mimeType || 'image/jpeg';
      const cleanData = img.base64.replace(/^data:[^;]+;base64,/, '');
      return {
        type: 'image_url' as const,
        image_url: {
          url: `data:${mime};base64,${cleanData}`,
          detail: 'high' as const,
        },
      };
    }),
  ];

  const completion = await openai.chat.completions.create({
    model: modelName,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const responseText = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(responseText);

  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.sessions)) return parsed.sessions;
  if (Array.isArray(parsed.classes)) return parsed.classes;
  if (Array.isArray(parsed.timetable)) return parsed.timetable;
  return [];
}

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

    let openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey || openAiApiKey.startsWith('sk-xxxx') || openAiApiKey.length < 30) {
      try {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          const match = content.match(/^OPENAI_API_KEY=(.+)$/m);
          if (match && match[1]?.trim()) {
            openAiApiKey = match[1].trim();
          }
        }
      } catch {
        // ignore fallback error
      }
    }
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!openAiApiKey && !geminiApiKey) {
      return NextResponse.json(
        { success: false, error: 'No AI API key configured on the server. Please add OPENAI_API_KEY in .env.local.' },
        { status: 500 }
      );
    }

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
  * FALLBACK GUARANTEE: If the target student's branch or semester is NOT explicitly written or found in the document, DO NOT output an empty array or only one single course! Instead, extract all course routine slots visible on the uploaded routine page(s) so the student can review and adjust them.

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

5. LUNCH BREAK & RECESS AVOIDANCE (CRITICAL):
- Timetables often have a middle column labeled "1-2" or "1:00-2:00" containing vertical letters spelling "L U N C H" (Monday: L, Tuesday: U, Wednesday: N, Thursday: C, Friday: H).
- This is strictly a LUNCH BREAK, NOT a class or course! NEVER extract L, U, N, C, H in the 1-2 PM slot as a subject!
- DO NOT let the lunch break column shift the afternoon periods:
  * 02:00 - 02:55 (14:00 - 14:55) is the first post-lunch period.
  * 03:00 - 03:55 (15:00 - 15:55) is the second post-lunch period.
  * 04:00 - 04:55 (16:00 - 16:55) is the third post-lunch period.
  * 05:00 - 05:55 (17:00 - 17:55) is the fourth post-lunch period.
- For example on Tuesday:
  * 02:00 - 02:55: Slot Z (Calculus, Dr. Jaya Rahod)
  * 03:00 - 03:55: Slot F (Internet of Things, Dr. Abhishek)
  * 04:00 - 05:55: Slot E (Entrepreneruship / Entrepreneurship, Dr. Amit) -> BOTH 04:00-04:55 and 05:00-05:55 are Slot E! MERGE them into 16:00 - 17:55 Entrepreneurship!

6. CONSECUTIVE PERIODS & COMBINED SLOTS (AUTO-MERGE CONTINUOUS CLASSES):
- If two or more consecutive class periods in the timetable belong to the same subject (e.g. Monday 09:00 - 09:55 and 10:00 - 10:55 Music, Tuesday 09:00 - 10:55 Calculus, Tuesday 16:00 - 17:55 Entrepreneurship, or multi-hour labs), MERGE them into a single combined session spanning from the overall start time to the overall end time.
- If parallel subjects or faculty share a slot with a slash (e.g. "ILC / Yoga"), keep the combined title and faculty (e.g. "Dr. Aruna / GF").

7. ACCURATE FACULTY & INSTRUCTOR MAPPING:
- Read the faculty name or initials written in THAT EXACT session cell, or match the subject code from the faculty reference legend table at the bottom/side.
- Match single-letter slots with the legend (e.g. Slot E -> Entrepreneruship, Dr. Amit; Slot Z -> Calculus, Dr. Jaya Rahod; Slot B -> Programming with C, Dr. Ruhul; Slot L -> Digital Electronics, Dr. Manoj; Slot F -> Internet of Things, Dr. Abhishek; Slot P -> IT Workshop, Prof. Srinivasa; Slot A -> Linear Algebra, Dr. Mithilesh; Slot ILC -> International Language Competency, Dr. Aruna).
- NEVER mix, swap, or associate faculty from other departments or neighboring periods. If no faculty is stated for that period, leave "faculty" as "".

8. STRICT ELECTIVES VS CORE COURSES:
- DO NOT mark a course as elective just because its slot code is letter 'E' (like Slot E, Slot A, Slot B). Slot 'E' is frequently used for regular core courses (e.g. Entrepreneurship / Entrepreneruship in engineering first year)!
- ONLY mark "isElective": true if the timetable explicitly uses words like "Elective", "Open Elective", "Department Elective", "Program Elective", or "OE"/"DE".
- Regular subjects like Entrepreneurship, Calculus, Digital Electronics, IoT, Music, Yoga are NOT electives: mark "isElective": false!

9. ACADEMIC COMMON SENSE & AUTO-INFERENCE ("USE YOUR BRAIN"):
- DEFAULT CLASSROOM INFERENCE:
  * Look at the header of the timetable (e.g. "Room No 138", "LT-1", "Hall 2").
  * If individual slots do not write a separate room number, AUTO-FILL "room" with the default classroom from the header (e.g. "138"). Do NOT leave room blank!
- TYPO CORRECTION:
  * Auto-correct obvious clerical errors in course titles (e.g. "Calculas" -> "Calculus", "Entrepreneruship" -> "Entrepreneurship", "Mathemetics" -> "Mathematics").
- FULL NAME RESOLUTION:
  * Never leave single letters (Z, B, L, F, P, E, A) as the subject name! Always resolve them to their full course titles from the legend table.
- FACULTY MAPPING:
  * If a subject has an instructor listed anywhere in the timetable legend (e.g. Dr. Amit for Entrepreneurship, Dr. Manoj for Verilog, Dr. Jaya Rahod for Calculus), ensure that faculty is filled for all sessions of that subject!

10. EXACT DATA SCHEMA:
For every extracted class session, return:
- "day": "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", or "Sunday"
- "startTime": 24-hour format "HH:MM" (e.g. "09:00", "14:00", "15:00", "16:00")
- "endTime": 24-hour format "HH:MM" (e.g. "10:00", "15:55", "16:55", "17:55")
- "subjectName": Specific subject name (e.g. "Computer Networks", "Operating Systems", "Entrepreneurship")
- "subjectCode": Course code if present (e.g. "CS 348", "E", "PHY114")
- "room": Room / Hall / Venue (e.g. "LA 002", "138", "LT-1")
- "faculty": Faculty name if visible (e.g. "Dr. Amit", "Dr. Manoj")
- "isLab": boolean (true for practical/lab sessions, else false)
- "isElective": boolean (true only if explicitly an Elective course; else false)
`;

    let extractedRawSessions: any[] = [];
    let successfulSource = '';
    let lastError: any = null;

    const hasPdf = imageList.some((img: any) => 
      img.mimeType === 'application/pdf' || 
      (img.base64 && img.base64.startsWith('JVBERi0'))
    );

    // 1. Primary Engine: OpenAI Vision if OPENAI_API_KEY is configured and input is an image (OpenAI Chat API vision only supports image formats)
    if (openAiApiKey && imageList.length > 0 && !hasPdf) {
      const openAiModels = ['gpt-4o', 'gpt-4o-mini'];
      for (const modelName of openAiModels) {
        try {
          const raw = await Promise.race([
            extractTimetableWithOpenAI(openAiApiKey, modelName, prompt, imageList),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`OpenAI ${modelName} timeout`)), 30000))
          ]);
          if (Array.isArray(raw) && raw.length > 0) {
            extractedRawSessions = raw;
            successfulSource = fileName || `OpenAI Vision (${modelName})`;
            break;
          }
        } catch (openAiErr: any) {
          logServerError(`ExtractTimetableAPI:OpenAI:${modelName}`, openAiErr);
          lastError = openAiErr;
        }
      }
    }

    // 2. Fallback Engine: Gemini Vision across active Gemini models
    if (extractedRawSessions.length === 0 && geminiApiKey && imageList.length > 0) {
      const candidateModels = [
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash',
        'gemini-flash-latest',
      ];
      const genAI = new GoogleGenerativeAI(geminiApiKey);

      const imageParts = imageList.map((img: any) => ({
        inlineData: {
          data: img.base64.replace(/^data:[^;]+;base64,/, ''),
          mimeType: img.mimeType || 'image/jpeg',
        },
      }));

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result: any = await Promise.race([
            model.generateContent([prompt, ...imageParts]),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Model ${modelName} timeout`)), 22000))
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
            extractedRawSessions = parsed;
            successfulSource = fileName || `Gemini Vision OCR (${modelName})`;
            break;
          }
        } catch (modelErr: any) {
          logServerError(`ExtractTimetableAPI:Gemini:${modelName}`, modelErr);
          lastError = modelErr;
        }
      }
    }

    // 3. Process and Sanitize Extracted Sessions
    if (extractedRawSessions.length > 0) {
      const sanitized = extractedRawSessions.map((s: any) => {
        let subjectName = (s.subjectName || '').trim() || 'Subject';
        if (/entrepreneruship/i.test(subjectName)) subjectName = 'Entrepreneurship';
        if (/calculas/i.test(subjectName)) subjectName = 'Calculus';

        const isElective = !/entrepreneur/i.test(subjectName) &&
          !/digital electronics/i.test(subjectName) &&
          (
            (/\belective\b/i.test(subjectName) || /\b(oe|de|pe)\b/i.test(s.subjectCode || '')) ||
            (!!s.isElective && (s.subjectCode || '').toUpperCase() !== 'E')
          );

        const start24 = clean24HourTime(s.startTime, '09:00');
        const end24 = clean24HourEndTime(s.endTime, s.startTime, '10:00');

        return {
          day: s.day || 'Monday',
          startTime: start24,
          endTime: end24,
          subjectName,
          subjectCode: (s.subjectCode || '').trim(),
          room: (s.room || '').trim(),
          faculty: (s.faculty || '').trim(),
          isLab: !!s.isLab || /lab|practical|workshop/i.test(subjectName) || /lab|practical|workshop/i.test(s.subjectCode || ''),
          isElective,
        };
      });

      // Smart Academic Auto-Inference ("AI Dimag Lagaye")
      // 1. Dominant Classroom Auto-Fill across sessions
      const roomCounts: Record<string, number> = {};
      sanitized.forEach(s => {
        if (s.room) {
          const cleanRoom = s.room.replace(/^room\s*(no\.?)?\s*/i, '').trim();
          roomCounts[cleanRoom] = (roomCounts[cleanRoom] || 0) + 1;
        }
      });
      let dominantRoom = '';
      let maxCount = 0;
      Object.entries(roomCounts).forEach(([r, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantRoom = r;
        }
      });
      if (dominantRoom && maxCount >= 2) {
        sanitized.forEach(s => {
          if (!s.room) s.room = dominantRoom;
          else s.room = s.room.replace(/^room\s*(no\.?)?\s*/i, '').trim();
        });
      }

      // 2. Cross-fill faculty across sessions of the same subject
      const subjectToFaculty: Record<string, string> = {};
      sanitized.forEach(s => {
        if (s.faculty && s.subjectName) {
          const key = s.subjectName.toLowerCase();
          if (!subjectToFaculty[key] || s.faculty.length > subjectToFaculty[key].length) {
            subjectToFaculty[key] = s.faculty;
          }
        }
      });
      sanitized.forEach(s => {
        if (!s.faculty && s.subjectName && subjectToFaculty[s.subjectName.toLowerCase()]) {
          s.faculty = subjectToFaculty[s.subjectName.toLowerCase()];
        }
      });

      const merged = mergeConsecutiveSessions(sanitized);
      return NextResponse.json({
        success: true,
        sessions: merged,
        source: successfulSource,
      });
    }

    if (lastError) {
      logServerError('ExtractTimetableAPI:AllEnginesFailed', lastError);
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
