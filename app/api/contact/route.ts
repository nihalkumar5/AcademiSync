import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const RECIPIENT_EMAIL = 'nihal88758@gmail.com';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const docData = {
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      subject: String(subject || 'Feedback / Support').trim(),
      message: String(message).trim(),
      recipientEmail: RECIPIENT_EMAIL,
      createdAt: timestamp,
      status: 'unread',
    };

    // 1. Permanently persist message in Firestore
    let messageId = '';
    try {
      const docRef = await adminDb.collection('contact_messages').add(docData);
      messageId = docRef.id;
    } catch (dbErr) {
      console.error('[ContactAPI] Failed to write to Firestore:', dbErr);
    }

    // 2. Forward message to FormSubmit to deliver straight to nihal88758@gmail.com
    let emailDispatched = false;
    try {
      const forwardRes = await fetch(`https://formsubmit.co/ajax/${RECIPIENT_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://academi-sync-chi.vercel.app',
          'Referer': 'https://academi-sync-chi.vercel.app/contact',
        },
        body: JSON.stringify({
          name: docData.name,
          email: docData.email,
          _subject: `[AcademiSync Support] ${docData.subject} from ${docData.name}`,
          _replyto: docData.email,
          topic: docData.subject,
          message: docData.message,
          receivedAt: timestamp,
          _template: 'table',
          _captcha: 'false',
        }),
      });

      if (forwardRes.ok) {
        emailDispatched = true;
      } else {
        const errText = await forwardRes.text();
        console.warn('[ContactAPI] FormSubmit response:', errText);
      }
    } catch (mailErr) {
      console.warn('[ContactAPI] Email forwarding error:', mailErr);
    }

    return NextResponse.json({
      success: true,
      messageId,
      emailDispatched,
      recipient: RECIPIENT_EMAIL,
    });
  } catch (error: any) {
    console.error('[ContactAPI] Internal error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process contact message' },
      { status: 500 }
    );
  }
}
