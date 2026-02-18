
import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Plant, GameData } from '@/interfaces/plant';

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

    await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error("User document does not exist.");
      }

      const userData = userDoc.data() as GameData;
      const allPlants = userData.plants || {};

      const nextId = (Object.keys(allPlants).reduce((maxId, id) => Math.max(parseInt(id, 10), maxId), 0) + 1);

      const newPlant: Plant = {
        id: nextId,
        name: "Fern",
        description: "A leafy green fern, perfect for a touch of nature.",
        image: "https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.firebasestorage.app/o/fallback-plants%2FFern.png?alt=media&token=8419d6f5-c491-46a2-83c3-931406731ef7",
        hint: 'fern.png',
        level: 1,
        xp: 0,
        form: 'Base',
        baseImage: '',
        lastWatered: [],
        hasGlitter: true,
        hasSheen: false,
        hasRainbowGlitter: false,
        hasRedGlitter: false,
        personality: 'Crisp',
        chatEnabled: false,
        conversationHistory: [],
        acquiredDate: new Date().toISOString(),
      };

      transaction.update(userRef, {
        [`plants.${nextId}`]: newPlant,
        collectionPlantIds: FieldValue.arrayUnion(nextId),
      });
    });

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
