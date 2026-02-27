
import { NextResponse } from 'next/server';
import { purchaseFertilizer } from '@/lib/firestore-admin';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    await purchaseFertilizer(userId);

    return NextResponse.json({ message: 'Fertilizer purchased successfully' });
  } catch (error) {
    console.error('Error purchasing fertilizer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
