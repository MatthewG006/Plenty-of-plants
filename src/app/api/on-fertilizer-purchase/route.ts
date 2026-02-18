
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Correctly initialize the Admin SDK
const apps = getApps();
if (!apps.length) {
  // In a deployed Firebase environment, GOOGLE_APPLICATION_CREDENTIALS is automatically set.
  // For local development, you would use a service account key.
  initializeApp();
}

const adminDb = getFirestore();

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new NextResponse('User ID is required.', { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      fertilizerCount: FieldValue.increment(1)
    });

    return NextResponse.json({ success: true, message: 'Fertilizer awarded successfully.' });
  } catch (error) {
    console.error('Fertilizer Purchase API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new NextResponse(
      JSON.stringify({ message: `Failed to process fertilizer purchase: ${errorMessage}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
