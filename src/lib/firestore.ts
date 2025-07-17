
import { doc, getDoc, setDoc, getFirestore, updateDoc, arrayUnion, DocumentData } from 'firebase/firestore';
import { app } from './firebase';
import type { Plant } from '@/interfaces/plant';
import type { DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { User } from 'firebase/auth';

const db = getFirestore(app);

const NUM_POTS = 3;

export interface GameData {
    gold: number;
    collection: Plant[];
    desk: (Plant | null)[];
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

        await setDoc(docRef, {
            email: user.email,
            username: user.displayName,
            avatarColor: avatarColor,
            gold: 0,
            collection: [],
            desk: Array(NUM_POTS).fill(null),
            gameId: `#${user.uid.slice(0, 8).toUpperCase()}`
        });
    }
}

export async function savePlant(userId: string, plant: DrawPlantOutput, isFirstPlant: boolean) {
    const gameData = await getUserGameData(userId);
    if (!gameData) throw new Error("User data not found.");

    const { collection, desk } = gameData;
    const allCurrentPlants = [...collection, ...desk.filter((p): p is Plant => p !== null)];
    const lastId = allCurrentPlants.reduce((maxId, p) => Math.max(p.id, maxId), 0);

    const newPlant: Plant = {
        id: lastId + 1,
        name: plant.name,
        form: 'Base',
        image: plant.imageDataUri,
        hint: isFirstPlant ? 'fern plant' : plant.name.toLowerCase().split(' ').slice(0, 2).join(' '),
        description: plant.description,
        level: 1,
        xp: 0,
        lastWatered: [],
    };

    const firstEmptyPotIndex = desk.findIndex(p => p === null);
    if (firstEmptyPotIndex !== -1) {
        desk[firstEmptyPotIndex] = newPlant;
    } else {
        collection.push(newPlant);
    }
    
    await setDoc(doc(db, 'users', userId), { collection, desk }, { merge: true });
    return newPlant;
}

export async function updatePlantArrangement(userId: string, collection: Plant[], desk: (Plant | null)[]) {
    await setDoc(doc(db, 'users', userId), { collection, desk }, { merge: true });
}

export async function updatePlantData(userId: string, updatedPlant: Plant) {
    const gameData = await getUserGameData(userId);
    if (!gameData) throw new Error("User data not found.");

    const { collection, desk } = gameData;
    
    const newDesk = desk.map(p => p?.id === updatedPlant.id ? updatedPlant : p);
    const newCollection = collection.map(p => p.id === updatedPlant.id ? updatedPlant : p);

    await setDoc(doc(db, 'users', userId), {
        collection: newCollection,
        desk: newDesk,
    }, { merge: true });
}

export async function updateUserGold(userId: string, amount: number) {
    const gameData = await getUserGameData(userId);
    if (!gameData) throw new Error("User data not found.");

    const newGold = (gameData.gold || 0) + amount;
    await setDoc(doc(db, 'users', userId), { gold: newGold }, { merge: true });
}
