import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logServerError } from '@/lib/errorUtils';
import { validateServerUploadPayload } from '@/lib/fileSafety';
import { checkAiRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { images, imageBase64, mimeType, fileName, userId, studentContext } = body;
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

    if (apiKey && imageList.length > 0) {
      const candidateModels = [
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash',
        'gemini-flash-latest',
      ];
      const genAI = new GoogleGenerativeAI(apiKey);

      const contextLines: string[] = [];
      if (studentContext) {
        if (studentContext.college) contextLines.push(`- Target College/University: ${studentContext.college}`);
        if (studentContext.programme) contextLines.push(`- Target Programme/Degree: ${studentContext.programme}`);
        if (studentContext.branch) contextLines.push(`- Target Branch/Department: ${studentContext.branch}`);
        if (studentContext.branchCode) contextLines.push(`- Target Branch Code / Acronym: ${studentContext.branchCode}`);
        if (studentContext.semester) contextLines.push(`- Target Semester: Semester ${studentContext.semester}`);
        if (studentContext.section) contextLines.push(`- Target Section/Group: ${studentContext.section}`);
        if (Array.isArray(studentContext.subjects) && studentContext.subjects.length > 0) {
          contextLines.push(`- Student's Enrolled Subjects & Course Codes:\n  * ${studentContext.subjects.join('\n  * ')}`);
        }
      }
      const contextPromptBlock = contextLines.length > 0 
        ? `\nTARGET STUDENT PROFILE & CONTEXT:\n${contextLines.join('\n')}\n` 
        : '';

      const prompt = `You are a world-class academic exam timetable extractor specializing in Indian university and college examination routines (e.g. IITs, NITs, IIITs, AKTU, VTU, MAKAUT, Anna Univ, Mumbai Univ, State & Central Universities).
Analyze the provided exam timetable document(s)/image(s)/PDF and extract all applicable exams into a strict single JSON array.
${contextPromptBlock}
CRITICAL INSTRUCTIONS FOR TARGET BRANCH CODE & SEMESTER ISOLATION:

1. BRANCH & BRANCH CODE FILTERING (ZERO CROSSOVER GUARANTEE):
- In Indian universities, master examination routines almost always compile schedules for ALL departments (e.g., CSE, IT, ECE, EE, ME, CE, CHE, etc.) onto a single master table, grid, or document.
- You MUST identify the target student's branch (${studentContext?.branch || 'specified branch'}) and branch code (${studentContext?.branchCode || 'specified code'}) and extract ONLY the exams belonging to this branch!
- Detection methods:
  * Table Columns: When the timetable has columns for each branch (e.g. "Date | Time | CSE | IT | ECE | ME | CE"), extract ONLY the subject from the student's branch column! Ignore all other columns.
  * Branch Sections: When the routine is split into blocks per branch (e.g. "Department of Computer Science & Engineering", "B.Tech CSE", "Branch: CSE"), extract exams ONLY from that section.
  * Course / Paper Code Prefixes: Match the subject code to the branch (e.g., CS/KCS/BCS for Computer Science; IT/KIT for Information Technology; EC/KEC for Electronics; EE/EEE for Electrical; ME for Mechanical; CE for Civil; CHE for Chemical; BT for Biotech; DS/AI/AIML for Data Science & AI).
  * Cross-Reference Enrolled Subjects: Match with the student's enrolled courses. If a paper corresponds to an enrolled subject name or code, it belongs to this student.
- STRICT PROHIBITION: NEVER extract exams belonging to other branches (e.g., do NOT extract Civil, Mechanical, Chemical, or Electrical engineering exams for a Computer Science student).

2. SEMESTER FILTERING:
- Master exam sheets often display exams for multiple semesters (e.g., 1st, 3rd, 5th, 7th Sem or I, III, V, VII Sem).
- If semester labels are present, extract ONLY the exams matching the student's target semester (${studentContext?.semester ? `Semester ${studentContext.semester}` : 'current semester'}).
- Ignore exams belonging to other semesters or backlogs of other batches.

3. FALLBACK GUARANTEE:
- If the document is for a single branch or routine without multi-branch columns or headings, extract all visible exam slots on the uploaded page(s) so the student can review and adjust them in the preview table. DO NOT return an empty list if exams are visible!

4. ACCURATE EXAM DATE & TIMINGS (STRICT 24-HOUR / ISO 8601):
- "date": ISO 8601 string combining the exam date and start time (e.g., "2026-10-25T09:30:00.000Z").
  * Parse Day, Month, and Year from the sheet. If Year is not stated, assume current academic year (${new Date().getFullYear()}).
  * Academic time resolution: Morning slots (09:00, 09:30, 10:00) are AM. Afternoon slots (01:30, 02:00, 02:30) are PM (13:30, 14:00).
- "time": Formatted human-readable string (e.g., "09:30 AM - 12:30 PM" or "02:00 PM - 05:00 PM").
- "durationMinutes": Calculate duration in minutes (e.g., 180 for a 3-hour exam, 120 for 2 hours).
- "subjectName": Full subject name and course code if available (e.g., "Operating Systems (CS501)").
- "syllabus": Syllabus, units, or modules mentioned, or null.
- "room": Room / Hall / Examination center number if mentioned, or null.

Return ONLY a raw JSON array:
[
  {
    "subjectName": "Operating Systems (CS501)",
    "date": "2026-10-25T09:30:00.000Z",
    "time": "09:30 AM - 12:30 PM",
    "syllabus": "Modules 1 to 4",
    "room": "Hall A",
    "durationMinutes": 180
  }
]`;

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
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Model ${modelName} timeout`)), 18000))
          ]);
          const responseText = result.response.text();
          let jsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const firstBracket = jsonStr.indexOf('[');
          const lastBracket = jsonStr.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
          }

          let parsed: any = null;
          try {
            parsed = JSON.parse(jsonStr);
          } catch (e) {
            const arrayMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (arrayMatch) {
              parsed = JSON.parse(arrayMatch[0]);
            }
          }

          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleanedExams = parsed.map((item: any, idx: number) => {
              let isoDate = item.date;
              if (!isoDate || isNaN(new Date(isoDate).getTime())) {
                const now = new Date();
                isoDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (idx * 2) + 1, 9, 30).toISOString();
              }
              return {
                subjectName: String(item.subjectName || 'Exam').trim(),
                date: isoDate,
                time: item.time || '09:30 AM - 12:30 PM',
                syllabus: item.syllabus ? String(item.syllabus).trim() : null,
                room: item.room ? String(item.room).trim() : null,
                durationMinutes: typeof item.durationMinutes === 'number' && item.durationMinutes > 0 ? item.durationMinutes : 180,
              };
            });

            return NextResponse.json({
              success: true,
              exams: cleanedExams,
              source: fileName || `Gemini Vision AI (${modelName})`,
            });
          }
        } catch (aiErr) {
          logServerError(`ExtractExamAPI:${modelName}`, aiErr);
        }
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Could not extract exam timetable. This can happen due to a weak internet connection, unreadable photo, or AI timeout. Please try again with a clear photo or add exams manually.' 
      },
      { status: 422 }
    );
  } catch (error) {
    logServerError('ExtractExamAPI:Unhandled', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process exam timetable document. Please try again.' },
      { status: 500 }
    );
  }
}
