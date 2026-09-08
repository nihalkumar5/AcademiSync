import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logServerError } from '@/lib/errorUtils';
import { validateServerUploadPayload } from '@/lib/fileSafety';

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType, fileName } = await req.json().catch(() => ({}));

    // Handle demo sample button directly
    if (fileName === 'demo_ml_assignment.jpg' && !imageBase64) {
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 2);
      defaultDeadline.setHours(23, 59, 0, 0);

      return NextResponse.json({
        success: true,
        homework: {
          subjectName: 'Machine Learning',
          title: 'Assignment 3: Neural Networks & Backpropagation',
          description: 'Derive the gradient update rules for a 3-layer MLP with Cross-Entropy loss. Submit handwritten derivations + Python code.',
          deadline: defaultDeadline.toISOString(),
          priority: 'High',
        },
        source: 'Sample Assignment',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (imageBase64) {
      const validation = validateServerUploadPayload([{ name: fileName, base64: imageBase64, mimeType }]);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.error || 'Invalid assignment file uploaded.' },
          { status: 400 }
        );
      }
    }

    if (apiKey && imageBase64) {
      const candidateModels = ['gemini-3.6-flash', 'gemini-1.5-flash'];
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

          const result = await model.generateContent([prompt, imagePart]);
          const responseText = result.response.text();
          
          let parsed: any = null;
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleaned);
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
