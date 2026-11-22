import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireCampusScope } from '@/lib/server/campusAdmin';
import { guardAiRequest } from '@/lib/aiGuard';
import { aiBudget, istToday, withTimeout } from '@/lib/server/aiRun';
import { logServerError } from '@/lib/errorUtils';

// Campus admins: turn a rough note ("hackathon kal 5 baje auditorium, register by 28 Nov")
// into a ready notice card. Only campus admins (or a super admin previewing a campus) can call it,
// and every call counts against the caller's AI quota like the other AI features.

export const maxDuration = 60;

const CATEGORIES = ['general', 'event', 'deal', 'merch', 'movie'] as const;
const LIMITS = { title: 60, subtitle: 110, cta: 20, badge: 24 };

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

export async function POST(req: Request) {
  const scope = await requireCampusScope(req);
  if (scope instanceof NextResponse) return scope;

  const body = await req.json().catch(() => ({}));
  const brief = clip(body.brief, 1200);
  if (brief.length < 4) {
    return NextResponse.json({ success: false, error: 'Write a line about the notice first.' }, { status: 400 });
  }
  const draft = body.draft && typeof body.draft === 'object'
    ? { title: clip(body.draft.title, LIMITS.title), subtitle: clip(body.draft.subtitle, LIMITS.subtitle) }
    : null;

  const blocked = await guardAiRequest(req);
  if (blocked) return blocked;

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'AI writing is not set up right now.' }, { status: 503 });
  }

  const today = istToday();
  const prompt = `You write short notices that appear as a card on students' home screens in a college app.
College: ${scope.college}
Today is ${today.label} (${today.iso}), India time.

The campus admin's note (may be Hindi, Hinglish or English, may be rough):
"""${brief}"""
${draft && (draft.title || draft.subtitle) ? `\nTheir current draft, improve it rather than starting over:\nHeadline: ${draft.title}\nSupporting line: ${draft.subtitle}\n` : ''}
Write the notice in clear, friendly English that a student understands in two seconds.
Rules:
- Use only facts from the note. Never invent dates, times, places, prices, names or links.
- "title": the headline, at most ${LIMITS.title} characters, no emoji, no full stop at the end.
- "subtitle": one supporting line with the key details (when, where, deadline), at most ${LIMITS.subtitle} characters.
- "ctaText": a 1 to 3 word button label such as "Register", "Learn more", "Apply now", "Get the deal", at most ${LIMITS.cta} characters.
- "category": one of ${CATEGORIES.join(', ')}. Use "event" for events, fests, talks, workshops and deadlines; "deal" for discounts; "merch" for hoodies, t-shirts and similar; "movie" for screenings; otherwise "general".
- "badgeText": a 1 to 3 word label for the card, such as "Hackathon", "Last date", "Workshop", at most ${LIMITS.badge} characters, or "" if nothing fits.
- "expiresOn": the last day the notice matters, as "YYYY-MM-DD" on or after today (the event day or the deadline). Relative dates count from today. If no date is given, "".

Return ONLY JSON: {"title":"","subtitle":"","ctaText":"","category":"","badgeText":"","expiresOn":""}`;

  const budget = aiBudget();
  const genAI = new GoogleGenerativeAI(apiKey);
  for (const modelName of ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-flash-latest']) {
    const slot = budget.slot(15000);
    if (!slot) break;
    try {
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: 'application/json', temperature: 0.6 } });
      const result: any = await withTimeout(model.generateContent(prompt), slot, modelName);
      const text = String(result.response.text() || '');
      const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const p = JSON.parse(json);
      const title = clip(p.title, LIMITS.title);
      if (!title) continue;
      const expiresOn = typeof p.expiresOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.expiresOn) && p.expiresOn >= today.iso ? p.expiresOn : '';
      return NextResponse.json({
        success: true,
        notice: {
          title,
          subtitle: clip(p.subtitle, LIMITS.subtitle),
          ctaText: clip(p.ctaText, LIMITS.cta) || 'Learn more',
          category: (CATEGORIES as readonly string[]).includes(p.category) ? p.category : 'general',
          badgeText: clip(p.badgeText, LIMITS.badge),
          expiresOn,
        },
      });
    } catch (e) {
      logServerError(`NoticeAI:${modelName}`, e);
    }
  }
  return NextResponse.json({ success: false, error: 'AI could not write this one. Try rewording your note.' }, { status: 502 });
}
