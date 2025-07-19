
import { doc, getDoc, setDoc, getFirestore, updateDoc, arrayUnion, DocumentData, writeBatch, increment } from 'firebase/firestore';
import { app, db } from './firebase';
import type { Plant } from '@/interfaces/plant';
import type { DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { User } from 'firebase/auth';
import { MAX_DRAWS } from './draw-manager';

const NUM_POTS = 3;

export interface GameData {
    gold: number;
    plants: Record<string, Plant>;
    collectionPlantIds: number[];
    deskPlantIds: (number | null)[];
    draws: number;
    lastDrawRefill: number;
    lastFreeDrawClaimed: number;
    waterRefills: number;
}

export async function getUserGameData(userId: string): Promise<GameData | null> {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        // Ensure default values if fields are missing
        return {
            gold: data.gold || 0,
            plants: data.plants || {},
            collectionPlantIds: data.collectionPlantIds || [],
            deskPlantIds: data.deskPlantIds || Array(NUM_POTS).fill(null),
            draws: data.draws ?? MAX_DRAWS,
            lastDrawRefill: data.lastDrawRefill || Date.now(),
            lastFreeDrawClaimed: data.lastFreeDrawClaimed || 0,
            waterRefills: data.waterRefills || 0,
        };
    } else {
        return null;
    }
}

export async function getPlantById(userId: string, plantId: number): Promise<Plant | null> {
    const gameData = await getUserGameData(userId);
    if (!gameData || !gameData.plants) return null;

    return gameData.plants[plantId] || null;
}

export async function createUserDocument(user: User): Promise<GameData> {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        const hue = Math.floor(Math.random() * 360);
        const avatarColor = `hsl(${hue}, 70%, 85%)`;

        const startingPlant: Plant = {
            id: 1,
            name: "Friendly Fern",
            description: "A happy little fern to start your collection.",
            image: "/fern.png",
            form: "Base",
            hint: "fern plant",
            level: 1,
            xp: 0,
            lastWatered: [],
        };
        
        const newGameData: GameData = {
            gold: 0,
            plants: { '1': startingPlant },
            collectionPlantIds: [],
            deskPlantIds: [1, null, null],
            draws: MAX_DRAWS,
            lastDrawRefill: Date.now(),
            lastFreeDrawClaimed: 0,
            waterRefills: 0,
        };

        await setDoc(docRef, {
            email: user.email,
            username: user.displayName,
            avatarColor: avatarColor,
            gameId: `#${user.uid.slice(0, 8).toUpperCase()}`,
            ...newGameData,
        });

        return newGameData;
    }
    
    return (await getUserGameData(user.uid))!;
}

export async function savePlant(userId: string, plantData: DrawPlantOutput): Promise<Plant> {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData) {
        throw new Error("User data not found, cannot save plant.");
    }
    
    // Sanitize the input object to ensure it's a plain JS object
    const plainPlantData = JSON.parse(JSON.stringify(plantData));

    const allPlantIds = Object.keys(gameData.plants).map(Number);
    const lastId = allPlantIds.length > 0 ? Math.max(...allPlantIds) : 0;

    const newPlant: Plant = {
        id: lastId + 1,
        name: plainPlantData.name,
        form: 'Base',
        image: plainPlantData.imageDataUri,
        hint: plainPlantData.name.toLowerCase().split(' ').slice(0, 2).join(' '),
        description: plainPlantData.description,
        level: 1,
        xp: 0,
        lastWatered: [],
    };

    const firstEmptyPotIndex = gameData.deskPlantIds.findIndex(id => id === null);

    const updatePayload: { [key: string]: any } = {
        [`plants.${newPlant.id}`]: newPlant,
    };
    
    if (firstEmptyPotIndex !== -1) {
        const newDeskPlantIds = [...gameData.deskPlantIds];
        newDeskPlantIds[firstEmptyPotIndex] = newPlant.id;
        updatePayload.deskPlantIds = newDeskPlantIds;
    } else {
        updatePayload.collectionPlantIds = arrayUnion(newPlant.id);
    }
    
    await updateDoc(userDocRef, updatePayload);
    
    return newPlant;
}


export async function updatePlantArrangement(userId: string, collectionPlantIds: number[], deskPlantIds: (number | null)[]) {
    await updateDoc(doc(db, 'users', userId), { 
        collectionPlantIds: collectionPlantIds, 
        deskPlantIds: deskPlantIds
    });
}

export async function updatePlant(userId: string, plantId: number, plantUpdateData: Partial<Plant>) {
    const userDocRef = doc(db, 'users', userId);
    
    const updates: { [key: string]: any } = {};
    // Ensure we are only updating fields on the specific plant sub-document
    for (const [key, value] of Object.entries(plantUpdateData)) {
        updates[`plants.${plantId}.${key}`] = value;
    }

    if (Object.keys(updates).length > 0) {
        await updateDoc(userDocRef, updates);
    }
}


export async function updateUserGold(userId: string, amount: number) {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        gold: increment(amount)
    });
}

export async function purchaseWaterRefills(userId: string, quantity: number, cost: number) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.gold < cost) {
        throw new Error("Not enough gold to purchase.");
    }

    await updateDoc(userDocRef, {
        gold: increment(-cost),
        waterRefills: increment(quantity)
    });
}

export async function useWaterRefill(userId: string) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.waterRefills <= 0) {
        throw new Error("No water refills to use.");
    }

    await updateDoc(userDocRef, {
        waterRefills: increment(-1)
    });
}

export async function resetUserGameData(userId: string) {
    const userDocRef = doc(db, 'users', userId);
    
    // Create a starter plant, since we are wiping the existing ones
    const startingPlant: Plant = {
        id: 1,
        name: "Friendly Fern",
        description: "A happy little fern to start your collection.",
        image: "/fern.png",
        form: "Base",
        hint: "fern plant",
        level: 1,
        xp: 0,
        lastWatered: [],
    };

    await updateDoc(userDocRef, {
        plants: { '1': startingPlant },
        collectionPlantIds: [],
        deskPlantIds: [1, null, null],
        gold: 0,
        draws: MAX_DRAWS,
        lastDrawRefill: Date.now(),
        lastFreeDrawClaimed: 0,
        waterRefills: 0
    });
}
