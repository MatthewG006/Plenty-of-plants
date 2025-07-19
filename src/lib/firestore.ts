
import { doc, getDoc, setDoc, getFirestore, updateDoc, arrayUnion, DocumentData, writeBatch, increment } from 'firebase/firestore';
import { app, db } from './firebase';
import type { Plant } from '@/interfaces/plant';
import type { DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { User } from 'firebase/auth';
import { MAX_DRAWS } from './draw-manager';

const NUM_POTS = 3;

export interface GameData {
    gold: number;
    collection: Plant[];
    desk: (Plant | null)[];
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
            collection: data.collection || [],
            desk: data.desk || Array(NUM_POTS).fill(null),
            draws: data.draws ?? MAX_DRAWS,
            lastDrawRefill: data.lastDrawRefill || Date.now(),
            lastFreeDrawClaimed: data.lastFreeDrawClaimed || 0,
            waterRefills: data.waterRefills || 0,
        };
    } else {
        return null;
    }
}

export async function createUserDocument(user: User) {
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

        await setDoc(docRef, {
            email: user.email,
            username: user.displayName,
            avatarColor: avatarColor,
            gold: 0,
            collection: [],
            desk: [startingPlant, null, null],
            gameId: `#${user.uid.slice(0, 8).toUpperCase()}`,
            draws: MAX_DRAWS,
            lastDrawRefill: Date.now(),
            lastFreeDrawClaimed: 0,
            waterRefills: 0,
        });
    }
}

export async function savePlant(userId: string, plant: DrawPlantOutput) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData) {
        throw new Error("User data not found, cannot save plant.");
    }

    const { collection, desk } = gameData;
    const allCurrentPlants = [...collection, ...desk.filter((p): p is Plant => p !== null)];
    const lastId = allCurrentPlants.reduce((maxId, p) => Math.max(p.id, maxId), 0);

    const newPlant: Plant = {
        id: lastId + 1,
        name: plant.name,
        form: 'Base',
        image: plant.imageDataUri,
        hint: plant.name.toLowerCase().split(' ').slice(0, 2).join(' '),
        description: plant.description,
        level: 1,
        xp: 0,
        lastWatered: [],
    };

    const firstEmptyPotIndex = desk.findIndex(p => p === null);
    if (firstEmptyPotIndex !== -1) {
        const newDesk = [...desk];
        newDesk[firstEmptyPotIndex] = newPlant;
        await updateDoc(userDocRef, { desk: newDesk });
    } else {
        await updateDoc(userDocRef, {
            collection: arrayUnion(newPlant)
        });
    }
    
    return newPlant;
}

export async function updatePlantArrangement(userId: string, collection: Plant[], desk: (Plant | null)[]) {
    await setDoc(doc(db, 'users', userId), { collection, desk }, { merge: true });
}

export async function batchUpdateOnWatering({ userId, updatedPlant, goldToAdd, usedRefill }: { userId: string, updatedPlant: Plant, goldToAdd: number, usedRefill: boolean }) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);
    if (!gameData) throw new Error("User data not found.");

    const { collection, desk } = gameData;
    
    const newDesk = desk.map(p => p?.id === updatedPlant.id ? updatedPlant : p);
    const newCollection = collection.map(p => p.id === updatedPlant.id ? updatedPlant : p);

    const batch = writeBatch(db);

    const updatePayload: any = {
        // Sanitize arrays to plain JS objects to avoid serialization issues with proxies
        collection: JSON.parse(JSON.stringify(newCollection)),
        desk: JSON.parse(JSON.stringify(newDesk)),
        gold: increment(goldToAdd),
    };

    if (usedRefill) {
        updatePayload.waterRefills = increment(-1);
    }
    
    batch.update(userDocRef, updatePayload);
    
    await batch.commit();
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
    await updateDoc(userDocRef, {
        collection: [],
        desk: [null, null, null],
        gold: 0,
        draws: MAX_DRAWS,
        lastDrawRefill: Date.now(),
        lastFreeDrawClaimed: 0,
        waterRefills: 0
    });
}
