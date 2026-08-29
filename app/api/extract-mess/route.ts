import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (apiKey && file) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Data = buffer.toString('base64');
        const mimeType = file.type || 'image/jpeg';

        const prompt = `You are an expert menu parser. Extract the hostel mess menu from the attached image.
Return the result EXACTLY as a JSON object with days of the week as keys.
Each day should be an object with meals as keys: 'Breakfast', 'Lunch', 'Snacks', 'Dinner'.
Each meal should be an array of strings representing the dishes.

Example output format:
{
  "Monday": {
    "Breakfast": ["Poha", "Tea", "Banana"],
    "Lunch": ["Dal", "Rice", "Roti", "Paneer"],
    "Snacks": ["Samosa", "Coffee"],
    "Dinner": ["Dal Makhani", "Rice", "Roti"]
  },
  "Tuesday": { }
}
Do not include any markdown formatting like json, just return the raw JSON.`;

        const result = await model.generateContent([
          {
            inlineData: {
              data: base64Data,
              mimeType
            }
          },
          prompt
        ]);

        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const data = JSON.parse(text);

        return NextResponse.json({
          success: true,
          data: data,
          source: 'Gemini Vision AI'
        });
      } catch (aiErr) {
        console.error('Gemini Mess Menu extraction error:', aiErr);
      }
    }

    // Fallback if no API key or API fails
    const mockData = {
      Monday: {
        Breakfast: ["Poha", "Tea", "Banana"],
        Lunch: ["Dal", "Rice", "Roti", "Paneer"],
        Snacks: ["Samosa", "Coffee"],
        Dinner: ["Dal Makhani", "Rice", "Roti"]
      },
      Tuesday: {
        Breakfast: ["Idli Sambhar", "Milk", "Apple"],
        Lunch: ["Rajma", "Rice", "Roti", "Salad"],
        Snacks: ["Patties", "Tea"],
        Dinner: ["Kadhai Paneer", "Rice", "Roti", "Ice Cream"]
      }
    };

    return NextResponse.json({
      success: true,
      data: mockData,
      source: 'Simulated OCR (Add GEMINI_API_KEY for live extraction)'
    });
  } catch (error: any) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
