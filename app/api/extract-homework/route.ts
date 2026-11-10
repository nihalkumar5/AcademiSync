import { NextResponse } from 'next/server';
import { aiBudget, istToday, withTimeout } from '@/lib/server/aiRun';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logServerError } from '@/lib/errorUtils';
import { validateServerUploadPayload } from '@/lib/fileSafety';
import { guardAiRequest } from '@/lib/aiGuard';

// AI scans can take a while; the model fallbacks share a ~52 s budget (lib/server/aiRun.ts)
export const maxDuration = 60;

export async function POST(req: Request) {
  const budget = aiBudget();
  try {
    const body = await req.json().catch(() => ({}));
    const { imageBase64, mimeType, fileName } = body;
    // Every page of the sheet (new), or one image (older app versions)
    const imageList: { name?: string; base64: string; mimeType?: string }[] = Array.isArray(body.images) && body.images.length
      ? body.images
      : imageBase64
        ? [{ name: fileName, base64: imageBase64, mimeType }]
        : [];
    const subjectNames: string[] = Array.isArray(body.subjects)
      ? body.subjects.filter((x: unknown) => typeof x === 'string' && x.trim()).map((x: string) => x.trim().slice(0, 120)).slice(0, 40)
      : [];

    // Signed-in users only, with durable per-user quotas (skip for mock demo clicks without image)
    if (imageList.length) {
      const blocked = await guardAiRequest(req);
      if (blocked) return blocked;
    }

    if (!imageList.length) {
      return NextResponse.json(
        { success: false, error: 'No assignment image or document provided.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    const validation = validateServerUploadPayload(imageList);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid assignment file uploaded.' },
        { status: 400 }
      );
    }

    if (apiKey && imageList.length) {
      const today = istToday();
      const candidateModels = [
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash',
        'gemini-flash-latest',
      ];
      const genAI = new GoogleGenerativeAI(apiKey);

      for (const modelName of candidateModels) {
        const slot = budget.slot(20000);
        if (!slot) break;
        try {
          const model = genAI.getGenerativeModel({ model: modelName });

          const prompt = `You are an assignment extractor for Indian college students.
The upload is an assignment handout, worksheet, notice, or problem sheet (${imageList.length > 1 ? `${imageList.length} pages of the same sheet` : 'one page'}).
Today is ${today.label} (${today.iso}), India time.
${subjectNames.length ? `The student's subjects:\n${subjectNames.map((n) => `- ${n}`).join('\n')}\nSet "subjectName" to the ONE name from this list that the sheet belongs to (match codes, short forms and teacher names), exactly as written in the list. If none fits, use the subject written on the sheet.` : 'Set "subjectName" to the course written on the sheet.'}

Deadline rules:
- Return it as "YYYY-MM-DDTHH:mm" in India time (no Z, no offset). Example: "2026-11-14T23:59".
- No time written: use 23:59. No year written: the next such date on or after today.
- Relative dates ("next Friday", "within a week", "by Monday") count from today.
- No deadline anywhere: null.

Return ONLY JSON:
{
  "subjectName": "...",
  "title": "Short clear title, e.g. Lab 4: Linked Lists, Assignment 2: Calculus",
  "description": "1-2 sentences: what to do or submit",
  "deadline": "YYYY-MM-DDTHH:mm" or null,
  "priority": "High" (due within 3 days or marked important), "Medium", or "Low"
}`;

          const imageParts = imageList.map((img) => ({
            inlineData: {
              data: String(img.base64).replace(/^data:[^;]+;base64,/, ''),
              mimeType: img.mimeType || 'image/jpeg',
            },
          }));

          const result: any = await withTimeout(model.generateContent([prompt, ...imageParts]), slot, modelName);
          const responseText = result.response.text();
          
          let parsed: any = null;
          let jsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const firstBrace = jsonStr.indexOf('{');
          const lastBrace = jsonStr.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
          }
          try {
            parsed = JSON.parse(jsonStr);
          } catch (e) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
            } else {
              const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
              parsed = JSON.parse(cleaned);
            }
          }

          if (parsed && (parsed.title || parsed.subjectName || parsed.description)) {
            return NextResponse.json({
              success: true,
              homework: {
                subjectName: parsed.subjectName || 'Assignment',
                title: parsed.title || 'Assignment Task',
                description: parsed.description || '',
                deadline: typeof parsed.deadline === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(parsed.deadline.trim())
                  ? `${parsed.deadline.trim()}:00+05:30`
                  : typeof parsed.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.deadline.trim())
                    ? `${parsed.deadline.trim()}T23:59:00+05:30`
                    : parsed.deadline || null,
                priority: parsed.priority || 'High',
              },
              source: fileName || 'Gemini Vision AI',
            });
          }
        } catch (aiErr) {
          logServerError(`ExtractHomeworkAPI:${modelName}`, aiErr);
        }
      }
    }

    return NextResponse.json(
      { success: false, error: 'Could not extract homework details from this image. Please fill in the details manually.' },
      { status: 400 }
    );
  } catch (error) {
    logServerError('ExtractHomeworkAPI:Unhandled', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process assignment document. Please try again.' },
      { status: 500 }
    );
  }
}
