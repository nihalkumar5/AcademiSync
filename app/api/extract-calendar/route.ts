import { NextResponse } from 'next/server';
import { aiBudget, istToday, withTimeout } from '@/lib/server/aiRun';
import { GoogleGenerativeAI, SchemaType, GenerationConfig } from '@google/generative-ai';
import { logServerError } from '@/lib/errorUtils';
import { validateServerUploadPayload } from '@/lib/fileSafety';
import { guardAiRequest } from '@/lib/aiGuard';

// AI scans can take a while; the model fallbacks share a ~52 s budget (lib/server/aiRun.ts)
export const maxDuration = 60;

export async function POST(req: Request) {
  const budget = aiBudget();
  try {
    const body = await req.json().catch(() => ({}));
    const { images, imageBase64, mimeType, fileName, isSample } = body;

    // Signed-in users only, with durable per-user quotas
    const blocked = await guardAiRequest(req);
    if (blocked) return blocked;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // Handle both legacy single image or new multi-image format
    const imageList = images || (imageBase64 ? [{ base64: imageBase64, mimeType }] : []);

    if (!imageList || imageList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No calendar document or image uploaded.' },
        { status: 400 }
      );
    }

    // File Upload Safety Validation (under 3MB)
    const validation = validateServerUploadPayload(imageList, 3 * 1024 * 1024);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid document uploaded. Must be under 3MB.' },
        { status: 400 }
      );
    }

    if (apiKey) {
      const candidateModels = [
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash',
        'gemini-flash-latest',
      ];
      const genAI = new GoogleGenerativeAI(apiKey);

      const generationConfig: GenerationConfig = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          description: 'List of academic events, exams, and holidays extracted from the calendar',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { 
                type: SchemaType.STRING, 
                description: 'Specific name/title of the academic event, holiday, or exam. E.g., "Mid-Semester Examinations", "Diwali Break", "AI Project Presentation", "Semester Registration".' 
              },
              startDate: { 
                type: SchemaType.STRING, 
                description: 'Start date of the event or range in YYYY-MM-DD format.' 
              },
              endDate: { 
                type: SchemaType.STRING, 
                description: 'End date of the event or range in YYYY-MM-DD format. If it is a single-day event or tentative milestone, set endDate to the same value as startDate.' 
              },
              type: { 
                type: SchemaType.STRING, 
                format: 'enum',
                enum: ['exam', 'holiday', 'event', 'assignment'],
                description: 'Type of event: "exam" for exams/tests, "holiday" for holidays/vacations, "event" for semester registrations/commencements/cultural programs, "assignment" for submission deadlines.' 
              },
              description: { 
                type: SchemaType.STRING, 
                description: 'Additional description, notes, tentative status, or timings written on the calendar.' 
              },
              location: { 
                type: SchemaType.STRING, 
                description: 'Location, hall, or room if specified.' 
              }
            },
            required: ['title', 'startDate', 'endDate', 'type']
          }
        } as any
      };

      const prompt = `You are a specialized academic calendar parsing assistant for university students.
Today is ${istToday().label} (India).
Analyze the provided academic calendar (which may be page image(s), a PDF, or a text version) and extract all events, examinations, holidays, registrations, and deadlines.

CRITICAL INSTRUCTIONS FOR DATE PROCESSING:
1. DATE RANGES: For events that span multiple days (e.g., "September 14, 2026 to September 19, 2026", "Oct 19 - 24, 2026", or "Mid-Sem: 15-20 October"), you MUST extract the start date into "startDate" and the end date into "endDate". For single-day events, set both "startDate" and "endDate" to the same date. Do NOT split them into multiple objects yourself; output them as a single object with a date range.
2. TENTATIVE OR MONTH-ONLY DATES (CRITICAL - DO NOT SPAN ENTIRE MONTH):
Many academic calendar rows specify only a month or have a footnote saying date will be announced later (e.g., "5th Convocation of the institute# | November, 2026", "Convocation date will be announced as per direction from Competent Authority", or "Alumni Meet: December 2026").
- DO NOT set a date range that spans the whole month (e.g., DO NOT return 2026-11-01 to 2026-11-30)!
- Instead, set BOTH "startDate" AND "endDate" to the 1st day of that month (e.g., "2026-11-01").
- In "description", clearly note: "Date tentative / to be announced in November 2026".
3. SINGLE MILESTONE VS DURATION EVENTS:
- Single milestones (such as Convocation, Commencement of classes, Semester registration, Senate meetings, Fee payment deadline, Last day of instruction, Declaration of results, Foundation Day) are point-in-time events. NEVER assign a multi-week date range to a single milestone event.
- Only use a multi-day range (where endDate > startDate) for genuine continuous multi-day events such as:
  * Examination windows (e.g., Mid-Semester Examinations 15-20 October)
  * Vacation / recess periods (e.g., Winter Vacation 18 Dec - 02 Jan, Mid-term recess)
  * Multi-day festivals (e.g., Tech Fest, Cultural Fest)
4. ACADEMIC YEAR BOUNDARY & YEAR INFERENCE: Academic calendars span across two calendar years (e.g., Academic Year 2026-27). Infer the correct year (YYYY) for each month. July to December are in the first year (e.g., 2026), and January to June are in the second year (e.g., 2027). Look closely at headers, footers, and text to confirm the correct academic year context.
5. THOROUGH EXTRACTION: Scan the entire document page-by-page. Extract registration dates, commencement of classes, holidays, preparation leaves, mid-semester exams, end-semester exams, fests, results announcements, and vacations.`;

      const fileParts = imageList.map((img: any) => ({
        inlineData: {
          data: img.base64.replace(/^data:[^;]+;base64,/, ''),
          mimeType: img.mimeType || 'image/jpeg',
        },
      }));
      const contents = [prompt, ...fileParts];

      let lastError: any = null;

      for (const modelName of candidateModels) {
        const slot = budget.slot(25000);
        if (!slot) break;
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig,
          });

          const result: any = await withTimeout(model.generateContent(contents), slot, modelName);

          const responseText = result.response.text();
          let parsed: any;
          try {
            parsed = JSON.parse(responseText);
          } catch {
            let jsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const firstBracket = jsonStr.indexOf('[');
            const lastBracket = jsonStr.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
              jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
              parsed = JSON.parse(jsonStr);
            } else {
              const arrayMatch = responseText.match(/\[[\s\S]*\]/);
              if (arrayMatch) {
                parsed = JSON.parse(arrayMatch[0]);
              } else {
                throw new Error('AI response was not in a valid JSON format: ' + responseText.substring(0, 150));
              }
            }
          }

          if (Array.isArray(parsed) && parsed.length > 0) {
            return NextResponse.json({
              success: true,
              events: parsed,
              source: fileName || `Gemini Vision OCR (${modelName})`,
            });
          }
        } catch (modelErr: any) {
          logServerError(`ExtractCalendarAPI:${modelName}`, modelErr);
          lastError = modelErr;
        }
      }

      if (lastError) {
        logServerError('ExtractCalendarAPI:AllModelsFailed', lastError);
      }
    }

    // Sample data only when the sample was asked for. A failed read must never look like a real
    // calendar (fake holidays would reach every student of a batch).
    if (!isSample) {
      return NextResponse.json(
        { success: false, error: "Couldn't read this calendar. Try a clearer photo or the PDF, or add the dates by hand." },
        { status: 422 }
      );
    }
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, '0');

    const defaultEvents = [
      {
        title: 'Mid-Semester Examinations',
        date: `${curYear}-${curMonth}-15`,
        type: 'exam',
        description: 'Mid-term theory exams',
        location: 'LT-1 & LT-2',
      },
      {
        title: 'Institute Foundation Day',
        date: `${curYear}-${curMonth}-22`,
        type: 'holiday',
        description: 'Classes suspended',
      },
      {
        title: 'Major Assignment Submission',
        date: `${curYear}-${curMonth}-28`,
        type: 'assignment',
        description: 'Submit project report to course coordinator',
      },
    ];

    return NextResponse.json({
      success: true,
      events: defaultEvents,
      source: fileName || 'Sample Calendar Extraction',
    });
  } catch (error: any) {
    logServerError('ExtractCalendarAPI:Unhandled', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process academic calendar document. Please try again later.' },
      { status: 500 }
    );
  }
}
