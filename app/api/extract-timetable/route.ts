import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { mergeConsecutiveSessions } from '@/lib/timetableUtils';
import { logServerError } from '@/lib/errorUtils';
import { validateServerUploadPayload } from '@/lib/fileSafety';
import { checkAiRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { images, imageBase64, mimeType, fileName, userId, isSample } = body;
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
      const candidateModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
      const genAI = new GoogleGenerativeAI(apiKey);

      const prompt = `You are a specialized timetable parsing assistant for university students across India.
Analyze the provided timetable image(s) and extract all class/lecture/lab slots across all pages into a strict single JSON array.

CRITICAL INSTRUCTIONS FOR SUBJECTS:
- Look at every cell carefully. Look for course abbreviations, course names, subject titles, or codes (e.g. "ML", "CNS", "PS", "DE", "DBMS", "Operating Systems", "Mathematics").
- Check if there is a legend / course reference table at the bottom or sides mapping short codes to full subject names.
- If a cell only contains an abbreviation like "PS" or "NS" or "DSA", use that exact abbreviation or its expanded name (e.g. "Probability & Statistics", "Network Security", "Data Structures").
- NEVER EVER return the generic word "Subject" or "Lecture" or "Class" as subjectName. Always put the specific subject name, abbreviation, or topic written in that slot.
- For each element, extract:
  * "day": "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", or "Sunday"
  * "startTime": 24-hour format "HH:MM" (e.g. "09:00", "10:05", "14:30")
  * "endTime": 24-hour format "HH:MM" (e.g. "10:00", "11:05", "16:30")
  * "subjectName": Specific subject name or abbreviation (e.g. "Probability & Statistics", "Machine Learning", "OS Lab")
  * "subjectCode": Course code if present (e.g. "CS302", "MA201")
  * "room": Room / Hall number (e.g. "118", "LT-1", "Lab 2")
  * "faculty": Faculty name if visible
  * "isLab": boolean (true if practical or lab session, else false)

Return ONLY raw valid JSON array:
[
  {
    "day": "Monday",
    "startTime": "10:05",
    "endTime": "11:05",
    "subjectName": "Probability & Statistics",
    "subjectCode": "MA201",
    "room": "118",
    "faculty": "Mr. Prashant Singh (VF)",
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
          const result = await model.generateContent([prompt, ...imageParts]);
          const responseText = result.response.text();
          const cleanedJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedJson);

          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = mergeConsecutiveSessions(parsed);
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
