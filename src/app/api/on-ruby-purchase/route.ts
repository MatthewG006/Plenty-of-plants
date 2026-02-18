
import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize the Admin SDK
if (!getApps().length) {
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

    // Atomically increment the user's ruby count by 5
    await userRef.update({
      rubyCount: FieldValue.increment(5)
    });

    return NextResponse.json({ success: true, message: 'Rubies awarded successfully.' });
  } catch (error) {
    console.error('Ruby Purchase API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new NextResponse(
      JSON.stringify({ message: `Failed to process ruby purchase: ${errorMessage}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
