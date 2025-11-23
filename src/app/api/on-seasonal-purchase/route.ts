
import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plant } from '@/interfaces/plant';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        const gameData = userDoc.data();
        const allPlantIds = Object.keys(gameData.plants || {}).map(Number);
        const newPlantId = (allPlantIds.length > 0 ? Math.max(...allPlantIds) : 0) + 1;

        // For now, we'll hardcode the first seasonal plant.
        // In the future, this could be fetched from a configuration.
        const seasonalPlant: Plant = {
            id: newPlantId,
            name: "Winter Wonder",
            description: "A rare plant that thrives in the cold, its leaves shimmer with frost.",
            image: "/seasonal/winter-wonder.png", // Make sure this image exists in your /public folder
            baseImage: '',
            hint: "winter-wonder.png",
            form: "Base",
            level: 1,
            xp: 0,
            lastWatered: [],
            hasGlitter: false,
            hasSheen: false,
            hasRainbowGlitter: false,
            hasRedGlitter: false,
            personality: '',
            chatEnabled: false,
            conversationHistory: [],
        };
        
        const firstEmptyPotIndex = gameData.deskPlantIds.findIndex((id: number | null) => id === null);

        const updatePayload: { [key: string]: any } = {
            [`plants.${newPlantId}`]: seasonalPlant,
        };

        if (firstEmptyPotIndex !== -1) {
            const newDeskPlantIds = [...gameData.deskPlantIds];
            newDeskPlantIds[firstEmptyPotIndex] = newPlantId;
            updatePayload.deskPlantIds = newDeskPlantIds;
        } else {
            updatePayload.collectionPlantIds = [...gameData.collectionPlantIds, newPlantId];
        }


        await updateDoc(userDocRef, updatePayload);

        return NextResponse.json({ status: 'success', plantName: seasonalPlant.name });

    } catch (error: any) {
        console.error('Internal Server Error:', error);
        return NextResponse.json({ error: error.message || 'An internal error occurred' }, { status: 500 });
    }
}

    