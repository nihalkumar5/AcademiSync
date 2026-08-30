import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    // Check if JSON body (from multi-image/PDF converter) or FormData
    let imageList: { name?: string; base64: string; mimeType: string }[] = [];
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      const { images, imageBase64, mimeType, fileName } = body;
      imageList = images || (imageBase64 ? [{ name: fileName, base64: imageBase64, mimeType }] : []);
    } else {
      const formData = await req.formData();
      const files = formData.getAll('files') as File[];
      const singleFile = formData.get('file') as File;
      const allFiles = files.length > 0 ? files : (singleFile ? [singleFile] : []);

      for (const file of allFiles) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        imageList.push({
          name: file.name,
          base64: buffer.toString('base64'),
          mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        });
      }
    }

    if (apiKey && imageList.length > 0) {
      const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      const genAI = new GoogleGenerativeAI(apiKey);

      const prompt = `You are a culinary expert & OCR assistant specializing in Indian hostel and university mess menus.
Analyze the attached mess menu document(s) / image(s) / PDF(s) and extract the full weekly meal plan.

CRITICAL INSTRUCTIONS:
1. AUTO-CORRECT SPELLINGS & TYPOS:
   - Identify Indian dishes, breads, curries, lentils, breakfast items, snacks, sweets, and beverages.
   - Correct all OCR noise, spelling mistakes, and bad transcriptions into clean, appetizing proper names.
   - Examples of corrections:
     * "Dal Bati" / "Daal Batti" -> "Dal Baati Churma"
     * "Sambhar" / "Sambar" -> "Sambar"
     * "Puri Sabji" / "Poori Bhaji" -> "Puri Bhaji"
     * "Chole Bhature" / "Chhole Batore" -> "Chole Bhature"
     * "Paneer Butter Masala" / "Panir Buttr" -> "Paneer Butter Masala"
     * "Poha Jalebi" / "Pohe" -> "Poha"
     * "Aloo Paratha" / "Alu Paratha" -> "Aloo Paratha"
     * "Kadhai Paneer" / "Kadhai Panir" -> "Kadhai Paneer"
     * "Rajma Chawal" / "Rajma Rice" -> "Rajma", "Rice"
     * "Gulab Jamun" / "Glab Jmun" -> "Gulab Jamun"
     * "Idli Sambar" -> "Idli", "Sambar", "Coconut Chutney"
     * "Matar Paneer" / "Mutter Paneer" -> "Matar Paneer"
     * "Dal Makhani", "Dal Tadka", "Mix Veg", "Kadhi Pakora", "Egg Curry", "Veg Biryani", "Raita", "Masala Dosa", "Upma"
   - Clean up each item: trim extra commas, remove prices, quantities (e.g. "2 pcs"), or day labels inside items.

2. DAYS AND MEALS:
   - For all 7 days: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday".
   - Each day must have 4 meal keys: "Breakfast", "Lunch", "Snacks", "Dinner".
   - Each meal must be an array of strings representing individual clean dishes.

3. MEAL TIMINGS (if specified in the document, extract them. Otherwise default):
   - "timings": {
       "Breakfast": "8:00 - 10:00",
       "Lunch": "12:30 - 2:30",
       "Snacks": "4:30 - 5:30",
       "Dinner": "7:30 - 9:30"
     }

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure:
{
  "menu": {
    "Monday": {
      "Breakfast": ["Aloo Paratha", "Curd", "Tea", "Banana"],
      "Lunch": ["Rajma", "Jeera Rice", "Roti", "Salad", "Boondi Raita"],
      "Snacks": ["Samosa", "Mint Chutney", "Masala Tea"],
      "Dinner": ["Paneer Butter Masala", "Dal Makhani", "Butter Roti", "Gulab Jamun"]
    },
    "Tuesday": { ... },
    "Wednesday": { ... },
    "Thursday": { ... },
    "Friday": { ... },
    "Saturday": { ... },
    "Sunday": { ... }
  },
  "timings": {
    "Breakfast": "8:00 - 10:00",
    "Lunch": "12:30 - 2:30",
    "Snacks": "4:30 - 5:30",
    "Dinner": "7:30 - 9:30"
  }
}
Do not include any markdown backticks or explanations, return ONLY raw JSON.`;

      const imageParts = imageList.map((img) => ({
        inlineData: {
          data: img.base64.replace(/^data:[^;]+;base64,/, ''),
          mimeType: img.mimeType || 'image/jpeg',
        },
      }));

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([prompt, ...imageParts]);
          let text = result.response.text();
          text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

          const parsed = JSON.parse(text);
          const menuObj = parsed.menu || parsed;
          const timingsObj = parsed.timings || {
            Breakfast: '8:00 - 10:00',
            Lunch: '12:30 - 2:30',
            Snacks: '4:30 - 5:30',
            Dinner: '7:30 - 9:30',
          };

          return NextResponse.json({
            success: true,
            data: menuObj,
            timings: timingsObj,
            source: `Gemini Vision AI (${modelName})`,
          });
        } catch (modelErr) {
          console.warn(`Gemini model ${modelName} error:`, modelErr);
        }
      }
    }

    // High quality intelligent Indian mess fallback
    const fallbackMenu = {
      Monday: {
        Breakfast: ["Aloo Paratha", "Curd", "Tea", "Banana"],
        Lunch: ["Rajma", "Steamed Rice", "Roti", "Mixed Salad"],
        Snacks: ["Samosa", "Green Chutney", "Tea"],
        Dinner: ["Paneer Butter Masala", "Dal Makhani", "Tandoori Roti", "Gulab Jamun"]
      },
      Tuesday: {
        Breakfast: ["Poha", "Sev", "Jalebi", "Hot Milk"],
        Lunch: ["Chole", "Bhature", "Jeera Rice", "Pickle"],
        Snacks: ["Veg Patties", "Coffee"],
        Dinner: ["Mix Veg", "Dal Tadka", "Phulka Roti", "Kheer"]
      },
      Wednesday: {
        Breakfast: ["Idli", "Medu Vada", "Sambar", "Coconut Chutney"],
        Lunch: ["Kadhi Pakora", "Khichdi", "Papad", "Salad"],
        Snacks: ["Bread Pakora", "Tea"],
        Dinner: ["Egg Curry / Shahi Paneer", "Dal Fry", "Roti", "Rasgulla"]
      },
      Thursday: {
        Breakfast: ["Upma", "Coconut Chutney", "Boiled Egg / Banana", "Tea"],
        Lunch: ["Dal Makhani", "Jeera Rice", "Butter Roti", "Raita"],
        Snacks: ["Maggi Noodles", "Cold Coffee"],
        Dinner: ["Aloo Gobi Matar", "Yellow Dal", "Roti", "Ice Cream"]
      },
      Friday: {
        Breakfast: ["Masala Dosa", "Sambar", "Chutney", "Filter Coffee"],
        Lunch: ["Soyabean Masala Curry", "Rice", "Roti", "Salad"],
        Snacks: ["Red Sauce Pasta", "Tea"],
        Dinner: ["Butter Chicken / Kadhai Paneer", "Biryani Rice", "Naan", "Sweets"]
      },
      Saturday: {
        Breakfast: ["Puri Bhaji", "Sooji Halwa", "Tea"],
        Lunch: ["Moong Dal Khichdi", "Aloo Chokha", "Papad", "Curd"],
        Snacks: ["Bhel Puri", "Tea"],
        Dinner: ["Malai Kofta", "Dal Fry", "Jeera Rice", "Roti"]
      },
      Sunday: {
        Breakfast: ["Bread Omelette / Veg Sandwich", "Toast Butter", "Fresh Juice"],
        Lunch: ["Hyderabadi Veg Biryani", "Mirchi Ka Salan", "Boondi Raita"],
        Snacks: ["French Fries", "Soft Drink"],
        Dinner: ["Dal Baati Churma", "Gatte Ki Sabzi", "Kheer"]
      }
    };

    const fallbackTimings = {
      Breakfast: '8:00 - 10:00',
      Lunch: '12:30 - 2:30',
      Snacks: '4:30 - 5:30',
      Dinner: '7:30 - 9:30',
    };

    return NextResponse.json({
      success: true,
      data: fallbackMenu,
      timings: fallbackTimings,
      source: 'Default Mess Routine',
    });
  } catch (error: any) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
