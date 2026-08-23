import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim().replace(/['"]/g, '') : null;

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function run() {
  try {
    const result = await model.generateContent('hello');
    console.log('1.5-flash Success');
  } catch (e) { console.error('1.5-flash fail:', e.message); }
  
  try {
    const model2 = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result2 = await model2.generateContent('hello');
    console.log('2.0-flash Success');
  } catch (e) { console.error('2.0-flash fail:', e.message); }

  try {
    const model3 = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const result3 = await model3.generateContent('hello');
    console.log('3.6-flash Success');
  } catch (e) { console.error('3.6-flash fail:', e.message); }
}
run();
