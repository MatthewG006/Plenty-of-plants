
import { doc, getDoc, setDoc, getFirestore, updateDoc, arrayUnion, DocumentData, writeBatch, increment, collection, getDocs, query, where, limit, deleteDoc, arrayRemove } from 'firebase/firestore';
import { app, db, auth } from './firebase';
import type { Plant } from '@/interfaces/plant';
import type { DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { User } from 'firebase/auth';
import { MAX_DRAWS } from './draw-manager';

const NUM_POTS = 3;
const MAX_WATERINGS_PER_DAY = 4;
const XP_PER_WATERING = 200;
const XP_PER_LEVEL = 1000;
const GOLD_PER_WATERING = 5;
const EVOLUTION_LEVEL = 10;

// Helper to check if a timestamp is from the current day
function isToday(timestamp: number): boolean {
    const today = new Date();
    const someDate = new Date(timestamp);
    return someDate.getDate() === today.getDate() &&
           someDate.getMonth() === today.getMonth() &&
           someDate.getFullYear() === today.getFullYear();
}

export interface GameData {
    gold: number;
    plants: Record<string, Plant>;
    collectionPlantIds: number[];
    deskPlantIds: (number | null)[];
    draws: number;
    lastDrawRefill: number;
    lastFreeDrawClaimed: number;
    lastLoginBonusClaimed: number;
    waterRefills: number;
    glitterCount: number;
    sheenCount: number;
    rainbowGlitterCount: number;
    showcasePlantIds: number[];
    challenges: Record<string, { progress: number, claimed: boolean }>;
    challengesStartDate: number;
    likes: number;
    likedUsers: string[];
}

export interface AutoWaterResult {
    evolutionCandidates: number[];
    refillsUsed: number;
    goldGained: number;
}

export interface CommunityUser {
    uid: string;
    username: string;
    avatarColor: string;
    showcasePlants: Plant[];
    likes: number;
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
            lastLoginBonusClaimed: data.lastLoginBonusClaimed || 0,
            waterRefills: data.waterRefills || 0,
            glitterCount: data.glitterCount || 0,
            sheenCount: data.sheenCount || 0,
            rainbowGlitterCount: data.rainbowGlitterCount || 0,
            showcasePlantIds: data.showcasePlantIds || [],
            challenges: data.challenges || {},
            challengesStartDate: data.challengesStartDate || 0,
            likes: data.likes || 0,
            likedUsers: data.likedUsers || [],
        };
    } else {
        return null;
    }
}

export async function getCommunityUsers(): Promise<CommunityUser[]> {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('showcasePlantIds', '!=', []), limit(20));
    const querySnapshot = await getDocs(q);

    const communityUsers: CommunityUser[] = [];

    querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const allPlants = data.plants || {};
        const showcasePlantIds = data.showcasePlantIds || [];
        
        const showcasePlants = showcasePlantIds
            .map((id: number) => allPlants[id])
            .filter(Boolean);

        if (showcasePlants.length > 0) {
            communityUsers.push({
                uid: docSnap.id,
                username: data.username || 'Anonymous',
                avatarColor: data.avatarColor || 'hsl(120, 70%, 85%)',
                showcasePlants: showcasePlants,
                likes: data.likes || 0,
            });
        }
    });

    return communityUsers.sort((a, b) => b.likes - a.likes);
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
            baseImage: '',
            form: "Base",
            hint: "fern plant",
            level: 1,
            xp: 0,
            lastWatered: [],
            hasGlitter: false,
            hasSheen: false,
            hasRainbowGlitter: false,
        };
        
        const newGameData: GameData = {
            gold: 20, // Start with bonus
            plants: { '1': startingPlant },
            collectionPlantIds: [],
            deskPlantIds: [1, null, null],
            draws: MAX_DRAWS,
            lastDrawRefill: Date.now(),
            lastFreeDrawClaimed: 0,
            lastLoginBonusClaimed: Date.now(),
            waterRefills: 0,
            glitterCount: 0,
            sheenCount: 0,
            rainbowGlitterCount: 0,
            showcasePlantIds: [],
            challenges: {},
            challengesStartDate: Date.now(),
            likes: 0,
            likedUsers: [],
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
        baseImage: '',
        hint: plainPlantData.name.toLowerCase().split(' ').slice(0, 2).join(' '),
        description: plainPlantData.description,
        level: 1,
        xp: 0,
        lastWatered: [],
        hasGlitter: false,
        hasSheen: false,
        hasRainbowGlitter: false,
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

export async function updatePlant(userId: string, plantId: number, plantUpdateData: Partial<Plant> | { [key: string]: any }) {
    const userDocRef = doc(db, 'users', userId);
    
    let updates: { [key: string]: any } = {};
    
    // Handle the special case where plantId is 0 for bulk updates
    if (plantId === 0) {
        updates = { ...plantUpdateData };
    } else {
        // Ensure we are only updating fields on the specific plant sub-document
        for (const [key, value] of Object.entries(plantUpdateData)) {
            updates[`plants.${plantId}.${key}`] = value;
        }
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

export async function purchaseCosmetic(userId: string, cosmetic: 'glitterCount' | 'sheenCount' | 'rainbowGlitterCount', quantity: number, cost: number) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.gold < cost) {
        throw new Error("Not enough gold to purchase.");
    }

    await updateDoc(userDocRef, {
        gold: increment(-cost),
        [cosmetic]: increment(quantity)
    });
}


export async function useGlitter(userId: string) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.glitterCount <= 0) {
        throw new Error("No glitter to use.");
    }

    await updateDoc(userDocRef, {
        glitterCount: increment(-1)
    });
}

export async function useSheen(userId: string) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.sheenCount <= 0) {
        throw new Error("No sheen packs to use.");
    }

    await updateDoc(userDocRef, {
        sheenCount: increment(-1)
    });
}

export async function useRainbowGlitter(userId: string) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.rainbowGlitterCount <= 0) {
        throw new Error("No rainbow glitter packs to use.");
    }

    await updateDoc(userDocRef, {
        rainbowGlitterCount: increment(-1)
    });
}

export async function resetUserGameData(userId: string) {
    const userDocRef = doc(db, 'users', userId);
    
    const startingPlant: Plant = {
        id: 1,
        name: "Friendly Fern",
        description: "A happy little fern to start your collection.",
        image: "/fern.png",
        baseImage: '',
        form: "Base",
        hint: "fern plant",
        level: 1,
        xp: 0,
        lastWatered: [],
        hasGlitter: false,
        hasSheen: false,
        hasRainbowGlitter: false,
    };

    await updateDoc(userDocRef, {
        plants: { '1': startingPlant },
        collectionPlantIds: [],
        deskPlantIds: [1, null, null],
        gold: 0,
        draws: MAX_DRAWS,
        lastDrawRefill: Date.now(),
        lastFreeDrawClaimed: 0,
        waterRefills: 0,
        glitterCount: 0,
        sheenCount: 0,
        rainbowGlitterCount: 0,
        showcasePlantIds: [],
    });
}

export async function deletePlant(userId: string, plantId: number) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || !gameData.plants[plantId]) {
        throw new Error("Plant not found for deletion.");
    }

    const { [`${plantId}`]: deletedPlant, ...remainingPlants } = gameData.plants;

    const newDeskPlantIds = gameData.deskPlantIds.map(id => (id === plantId ? null : id));
    const newCollectionPlantIds = gameData.collectionPlantIds.filter(id => id !== plantId);
    const newShowcasePlantIds = gameData.showcasePlantIds.filter(id => id !== plantId);

    await updateDoc(userDocRef, {
        plants: remainingPlants,
        deskPlantIds: newDeskPlantIds,
        collectionPlantIds: newCollectionPlantIds,
        showcasePlantIds: newShowcasePlantIds,
    });
}


export async function updateShowcasePlants(userId: string, plantIds: number[]) {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        showcasePlantIds: plantIds,
    });
}

export async function likeUser(likerUid: string, likedUid: string) {
    const likerDocRef = doc(db, 'users', likerUid);
    const likedDocRef = doc(db, 'users', likedUid);
    const likerData = await getUserGameData(likerUid);

    if (!likerData) throw new Error("Liker data not found.");
    if (likerData.likedUsers.includes(likedUid)) throw new Error("User already liked.");
    if (likerUid === likedUid) throw new Error("You cannot like yourself.");

    const batch = writeBatch(db);
    batch.update(likerDocRef, { likedUsers: arrayUnion(likedUid) });
    batch.update(likedDocRef, {
        likes: increment(1),
        gold: increment(5)
    });
    await batch.commit();
}


export async function useAllWaterRefills(userId: string): Promise<AutoWaterResult> {
  const userDocRef = doc(db, 'users', userId);
  const gameData = await getUserGameData(userId);

  if (!gameData || gameData.waterRefills <= 0) {
    return { evolutionCandidates: [], refillsUsed: 0, goldGained: 0 };
  }

  const allPlants = Object.values(gameData.plants);
  let availableRefills = gameData.waterRefills;
  
  const updates: { [key: string]: any } = {};
  const evolutionCandidates: number[] = [];
  let refillsUsed = 0;
  let goldGained = 0;
  const now = Date.now();

  for (const plant of allPlants) {
    if (availableRefills <= 0) break; // No more refills to use

    const timesWateredToday = plant.lastWatered?.filter(isToday).length ?? 0;
    const canWaterMore = timesWateredToday < MAX_WATERINGS_PER_DAY;

    if (canWaterMore) {
      availableRefills--;
      refillsUsed++;

      const xpGained = XP_PER_WATERING;
      let newXp = plant.xp + xpGained;
      let newLevel = plant.level;

      if (newXp >= XP_PER_LEVEL) {
        const levelsGained = Math.floor(newXp / XP_PER_LEVEL);
        newLevel += levelsGained;
        newXp %= XP_PER_LEVEL;

        if (newLevel >= EVOLUTION_LEVEL && plant.form === 'Base') {
          evolutionCandidates.push(plant.id);
        }
      }
      
      const updatedLastWatered = [...(plant.lastWatered || []).filter(isToday), now];
      
      updates[`plants.${plant.id}.xp`] = newXp;
      updates[`plants.${plant.id}.level`] = newLevel;
      updates[`plants.${plant.id}.lastWatered`] = updatedLastWatered;
    }
  }

  if (refillsUsed > 0) {
    goldGained = refillsUsed * GOLD_PER_WATERING;
    updates.waterRefills = increment(-refillsUsed);
    updates.gold = increment(goldGained);
    await updateDoc(userDocRef, updates);
  }

  return { evolutionCandidates, refillsUsed, goldGained };
}

    