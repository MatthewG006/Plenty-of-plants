import { NextResponse } from 'next/server';
import { purchaseSeasonalPlantPack } from '@/lib/firestore';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new NextResponse('User ID is required.', { status: 400 });
    }

    await purchaseSeasonalPlantPack(userId);

    return NextResponse.json({ success: true, message: 'Seasonal plant pack purchased successfully.' });
  } catch (error) {
    console.error('Seasonal Purchase API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new NextResponse(
      JSON.stringify({ message: `Failed to process seasonal plant pack purchase: ${errorMessage}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
