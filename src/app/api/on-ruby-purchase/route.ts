
import { NextResponse } from 'next/server';
import { updateUserRubies } from '@/lib/firestore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body?.userId;

    if (!userId) {
      return new NextResponse('User ID is required.', { status: 400 });
    }

    await updateUserRubies(userId, 5); // Award 5 rubies

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
