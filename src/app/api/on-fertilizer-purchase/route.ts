import { NextResponse } from 'next/server';
import { purchaseTimeReducer } from '@/lib/firestore';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new NextResponse('User ID is required.', { status: 400 });
    }

    await purchaseTimeReducer(userId);

    return NextResponse.json({ success: true, message: 'Fertilizer purchased successfully.' });
  } catch (error) {
    console.error('Fertilizer Purchase API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new NextResponse(
      JSON.stringify({ message: `Failed to process fertilizer purchase: ${errorMessage}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
