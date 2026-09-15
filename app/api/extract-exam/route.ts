import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logServerError } from '@/lib/errorUtils';
import { validateServerUploadPayload } from '@/lib/fileSafety';
import { checkAiRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { images, imageBase64, mimeType, fileName, userId } = body;
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

      const prompt = `You are an academic exam timetable extractor.
Analyze the provided exam timetable image(s) and extract all exams across all pages into a strict single JSON array.
Each element MUST have:
- "subjectName": Full subject name
- "date": ISO 8601 Date string (e.g. "2026-10-25T09:00:00.000Z") - Combine the date and the start time! Assume year is current year if not specified.
- "time": String representing time (e.g. "09:00 AM - 12:00 PM")
- "syllabus": "Extract any syllabus topics mentioned, or null"
- "room": "Room or hall if mentioned, or null"
- "durationMinutes": Calculate duration in minutes (e.g. 180 for 3 hours)

Return ONLY raw JSON array.
[
  {
    "subjectName": "Machine Learning",
    "date": "2026-10-25T09:00:00.000Z",
    "time": "09:00 AM - 12:00 PM",
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
            return NextResponse.json({
              success: true,
              exams: parsed,
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
