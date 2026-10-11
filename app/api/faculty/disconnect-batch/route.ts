import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, batchKey, batchCode, batchId } = body;

    if (!userId || (!batchKey && !batchCode && !batchId)) {
      return NextResponse.json(
        { success: false, error: 'userId and batchKey/batchCode/batchId are required' },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data() || {};
    const profile = userData.profile || {};
    const linkedBatches: any[] = Array.isArray(profile.facultyLinkedBatches)
      ? profile.facultyLinkedBatches
      : [];

    const normCode = batchCode ? String(batchCode).trim().toUpperCase() : '';
    const normKey = batchKey ? String(batchKey).trim() : '';
    const normId = batchId ? String(batchId).trim() : '';

    const updatedBatches = linkedBatches.filter((b: any) => {
      if (normId && b.id && String(b.id).trim() === normId) return false;
      if (normKey && b.batchKey && String(b.batchKey).trim() === normKey) return false;
      if (normCode && b.batchCode && String(b.batchCode).trim().toUpperCase() === normCode) return false;
      return true;
    });

    const remainingPrimary = updatedBatches.length > 0 ? updatedBatches[0] : null;
    const shouldResetPrimaryKey =
      (normKey && profile.batchKey === normKey) ||
      (normCode && profile.batchCode && String(profile.batchCode).trim().toUpperCase() === normCode);

    const newBatchKey = shouldResetPrimaryKey
      ? (remainingPrimary?.batchKey || '')
      : (profile.batchKey || '');

    const newBatchCode = shouldResetPrimaryKey
      ? (remainingPrimary?.batchCode || '')
      : (profile.batchCode || '');

    const now = Date.now();

    await userRef.update({
      'profile.facultyLinkedBatches': updatedBatches,
      'profile.batchKey': newBatchKey,
      'profile.batchCode': newBatchCode,
      lastUpdated: now,
    });

    return NextResponse.json({
      success: true,
      remainingBatches: updatedBatches,
      batchKey: newBatchKey,
      batchCode: newBatchCode,
      lastUpdated: now,
    });
  } catch (error) {
    logServerError('FacultyDisconnectBatchAPI', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect batch' },
      { status: 500 }
    );
  }
}
