import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logServerError } from '@/lib/errorUtils';
import { validateServerUploadPayload } from '@/lib/fileSafety';
import { checkAiRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { imageBase64, mimeType, fileName, userId } = body;
    const clientUserId = userId || req.headers.get('x-user-id') || null;

    // Campus-Safe AI Rate Limiter Guard (skip for mock demo clicks without image)
    if (imageBase64) {
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
    }

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'No assignment image or document provided.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    const validation = validateServerUploadPayload([{ name: fileName, base64: imageBase64, mimeType }]);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid assignment file uploaded.' },
        { status: 400 }
      );
    }

    if (apiKey && imageBase64) {
      const candidateModels = [
        'gemini-3.6-flash',
        'gemini-flash-latest',
        'gemini-3.7-flash',
        'gemini-3.8-flash',
      ];
      const genAI = new GoogleGenerativeAI(apiKey);

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });

          const prompt = `You are an academic homework and assignment extractor for college students.
Analyze this uploaded assignment handout, worksheet, notice, or problem sheet and extract the task details.
Return ONLY valid JSON matching this exact structure:
{
  "subjectName": "Extracted or inferred course / subject name",
  "title": "Clean concise assignment title (e.g. Lab 4: Linked Lists, Homework 2: Calculus)",
  "description": "Short 1-2 sentence description of problem statements or requirements",
  "deadline": "ISO 8601 string of submission deadline if visible, or null",
  "priority": "High" or "Medium" or "Low"
}`;

          const imagePart = {
            inlineData: {
              data: imageBase64.replace(/^data:[^;]+;base64,/, ''),
              mimeType: mimeType || 'image/jpeg',
            },
          };

          const result: any = await Promise.race([
            model.generateContent([prompt, imagePart]),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Model ${modelName} timeout`)), 18000))
          ]);
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
                deadline: parsed.deadline || null,
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
