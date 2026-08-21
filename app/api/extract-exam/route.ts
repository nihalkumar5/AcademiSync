import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { images, imageBase64, mimeType, fileName } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // Handle both legacy single image or new multi-image format
    const imageList = images || (imageBase64 ? [{ base64: imageBase64, mimeType }] : []);

    if (apiKey && imageList.length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

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

        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();
        const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);

        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json({
            success: true,
            exams: parsed,
            source: fileName || 'Gemini Vision AI',
          });
        }
      } catch (aiErr) {
        console.error('Gemini Exam extraction error:', aiErr);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process document' },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process document' },
      { status: 500 }
    );
  }
}
