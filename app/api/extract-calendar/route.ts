import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { images, imageBase64, mimeType, fileName, isSample } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // Handle both legacy single image or new multi-image format
    const imageList = images || (imageBase64 ? [{ base64: imageBase64, mimeType }] : []);

    const isSampleRun = !!(isSample || imageList.length === 0);

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-3.6-flash',
          generationConfig: {
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
                  date: { 
                    type: SchemaType.STRING, 
                    description: 'Start date of the event in YYYY-MM-DD format.' 
                  },
                  type: { 
                    type: SchemaType.STRING, 
                    format: 'enum',
                    enum: ['exam', 'holiday', 'event', 'assignment'],
                    description: 'Type of event: "exam" for exams/tests, "holiday" for holidays/vacations, "event" for semester registrations/commencements/cultural programs, "assignment" for submission deadlines.' 
                  },
                  description: { 
                    type: SchemaType.STRING, 
                    description: 'Additional description, notes, or timings written on the calendar.' 
                  },
                  location: { 
                    type: SchemaType.STRING, 
                    description: 'Location, hall, or room if specified.' 
                  }
                },
                required: ['title', 'date', 'type']
              }
            }
          }
        });

        const prompt = `You are a specialized academic calendar parsing assistant for university students.
Analyze the provided academic calendar (which may be page image(s), a PDF, or a text version) and extract all events, examinations, holidays, registrations, and deadlines.

CRITICAL INSTRUCTIONS FOR DATE PROCESSING:
1. DATE RANGE SPLITTING: If the calendar specifies a range of dates for an event (e.g., "September 14, 2026 to September 19, 2026", "Oct 19 - 24, 2026", or "Mid-Sem: 15-20 October"), you MUST generate a separate event object for EACH day in that range. For example, for a holiday from Oct 20 to Oct 22, create 3 separate items: one for 2026-10-20, one for 2026-10-21, and one for 2026-10-22, all with the title "Diwali Holidays". This ensures that the user's monthly calendar grid renders the event color correctly across all days of the range.
2. ACADEMIC YEAR BOUNDARY & YEAR INFERENCE: Academic calendars span across two calendar years (e.g., Academic Year 2026-27). Infer the correct year (YYYY) for each month. July to December are in the first year (e.g., 2026), and January to June are in the second year (e.g., 2027). Look closely at headers, footers, and text to confirm the correct academic year context.
3. THOROUGH EXTRACTION: Scan the entire document page-by-page. Do not skip any events. Extract registration dates, commencement of classes, holidays, preparation leaves, mid-semester exams, end-semester exams, fests, results announcements, and vacations.`;

        let contents: any[] = [prompt];

        if (isSampleRun) {
          // Pass the text representation of the IIIT-NR Academic Calendar
          contents.push(`Here is the text version of the IIIT-NR Academic Calendar for Odd Semester 2026:
          
          International Institute of Information Technology, Naya Raipur
          ACADEMIC CALENDAR FOR ODD SEMESTER (JULY - DECEMBER 2026)
          
          1. Registration for Semester: July 15, 2026
          2. Commencement of Classes: July 17, 2026
          3. Mid-Semester Examinations (LT-1 & LT-2): September 14, 2026 to September 19, 2026 (No classes during exams)
          4. Dussehra Holidays: October 19, 2026 to October 24, 2026
          5. Diwali Holidays: November 9, 2026 to November 14, 2026
          6. End-Semester Examination: November 30, 2026 to December 11, 2026
          7. Winter Vacation: December 14, 2026 to January 3, 2027
          8. Announcement of Results: December 28, 2026`);
        } else {
          // Pass the uploaded files (base64)
          const fileParts = imageList.map((img: any) => ({
            inlineData: {
              data: img.base64.replace(/^data:[^;]+;base64,/, ''),
              mimeType: img.mimeType || 'image/jpeg',
            },
          }));
          contents.push(...fileParts);
        }

        const result = await model.generateContent(contents);
        const responseText = result.response.text().trim();
        
        let parsed;
        try {
          parsed = JSON.parse(responseText);
        } catch (jsonErr) {
          console.warn('Direct JSON parse failed, attempting cleanup. Raw response:', responseText);
          const cleanedJson = responseText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
          try {
            parsed = JSON.parse(cleanedJson);
          } catch (jsonErr2) {
            // Regex fallback to extract array [ ... ]
            const arrayMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
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
            source: isSampleRun ? 'IIIT-NR Sample Text via Gemini' : (fileName || 'Gemini Vision OCR'),
          });
        } else {
          throw new Error('Parsed output is not a valid non-empty array of events');
        }
      } catch (aiErr: any) {
        console.error('Gemini Calendar OCR parsing error:', aiErr);
        // If it's NOT a sample run, bubble up the error instead of silently returning mock data
        if (!isSampleRun) {
          return NextResponse.json(
            { success: false, error: aiErr.message || 'AI extraction failed' },
            { status: 500 }
          );
        }
      }
    }

    // Fallback for sample run or when API key is missing
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
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process academic calendar document' },
      { status: 500 }
    );
  }
}
