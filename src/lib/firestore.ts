

import { doc, getDoc, setDoc, getFirestore, updateDoc, arrayUnion, DocumentData, writeBatch, increment, collection, getDocs, query, where, limit, deleteDoc, arrayRemove, runTransaction, serverTimestamp } from 'firebase/firestore';
import { app, db, auth } from './firebase';
import type { Plant, Seed } from '@/interfaces/plant';
import type { DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { User } from 'firebase/auth';
import { MAX_DRAWS } from './draw-manager';
import { v4 as uuidv4 } from 'uuid';

export const NUM_POTS = 3;
export const NUM_GARDEN_PLOTS = 12;
const MAX_WATERINGS_PER_DAY = 4;
const XP_PER_WATERING = 200;
const XP_PER_LEVEL = 1000;
const GOLD_PER_WATERING = 5;
const EVOLUTION_LEVEL = 10;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SEEDS = 9;

export interface GameData {
    gold: number;
    plants: Record<string, Plant>;
    collectionPlantIds: number[];
    deskPlantIds: (number | null)[];
    gardenPlantIds: (number | null)[];
    seeds: Seed[];
    draws: number;
    lastDrawRefill: number;
    lastFreeDrawClaimed: number;
    lastLoginBonusClaimed: number;
    sprinklerUnlocked: boolean;
    glitterCount: number;
    sheenCount: number;
    rainbowGlitterCount: number;
    redGlitterCount: number;
    fertilizerCount: number;
    showcasePlantIds: number[];
    challenges: Record<string, { progress: number, claimed: boolean }>;
    challengesStartDate: number;
    likes: number;
    likedUsers: Record<string, number>; // UID -> timestamp
    autoWaterUnlocked?: boolean;
    autoWaterEnabled?: boolean;
    waterRefillCount: number;
    rubyCount: number;
    plantChatTokens: number;
}

export interface CommunityUser {
    uid: string;
    username: string;
    avatarColor: string;
    showcasePlants: Plant[];
    likes: number;
}

export interface Contestant extends Plant {
    votes: number;
    voterIds: string[];
    ownerId: string;
    ownerName: string;
}

export interface ContestSession {
    id: string;
    status: 'waiting' | 'voting' | 'finished';
    createdAt: string; // ISO string
    expiresAt: string; // ISO string
    round: number;
    contestants: Contestant[];
    winner?: Contestant;
}


// Helper to check if a timestamp is from the current day
function isToday(timestamp: number): boolean {
    const today = new Date();
    const someDate = new Date(timestamp);
    return someDate.getDate() === today.getDate() &&
           someDate.getMonth() === today.getMonth() &&
           someDate.getFullYear() === today.getFullYear();
}

export async function getUserGameData(userId: string): Promise<GameData | null> {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        
        let likedUsersData = data.likedUsers || {};
        // Backwards compatibility for old array format
        if (Array.isArray(data.likedUsers)) {
            likedUsersData = data.likedUsers.reduce((acc: Record<string, number>, uid: string) => {
                acc[uid] = 1; // Give old likes a timestamp of 1 to make them permanent but identifiable
                return acc;
            }, {});
        }

        // Ensure default values if fields are missing
        return {
            gold: data.gold || 0,
            plants: data.plants || {},
            collectionPlantIds: data.collectionPlantIds || [],
            deskPlantIds: data.deskPlantIds || Array(NUM_POTS).fill(null),
            gardenPlantIds: data.gardenPlantIds || Array(NUM_GARDEN_PLOTS).fill(null),
            seeds: data.seeds || [],
            draws: data.draws ?? MAX_DRAWS,
            lastDrawRefill: data.lastDrawRefill || Date.now(),
            lastFreeDrawClaimed: data.lastFreeDrawClaimed || 0,
            lastLoginBonusClaimed: data.lastLoginBonusClaimed || 0,
            sprinklerUnlocked: data.sprinklerUnlocked || false,
            glitterCount: data.glitterCount || 0,
            sheenCount: data.sheenCount || 0,
            rainbowGlitterCount: data.rainbowGlitterCount || 0,
            redGlitterCount: data.redGlitterCount || 0,
            fertilizerCount: data.fertilizerCount || 0,
            showcasePlantIds: data.showcasePlantIds || [],
            challenges: data.challenges || {},
            challengesStartDate: data.challengesStartDate || 0,
            likes: data.likes || 0,
            likedUsers: likedUsersData,
            autoWaterUnlocked: data.autoWaterUnlocked || false,
            autoWaterEnabled: data.autoWaterEnabled || false,
            waterRefillCount: data.waterRefillCount || 0,
            rubyCount: data.rubyCount || 0,
            plantChatTokens: data.plantChatTokens || 0,
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
            hasRedGlitter: false,
            personality: '',
            chatEnabled: false,
            conversationHistory: [],
        };
        
        const newGameData: GameData = {
            gold: 20, // Start with bonus
            plants: { '1': startingPlant },
            collectionPlantIds: [],
            deskPlantIds: Array(NUM_POTS).fill(null),
            gardenPlantIds: Array(NUM_GARDEN_PLOTS).fill(null),
            seeds: [],
            draws: MAX_DRAWS,
            lastDrawRefill: Date.now(),
            lastFreeDrawClaimed: 0,
            lastLoginBonusClaimed: Date.now(),
            sprinklerUnlocked: false,
            glitterCount: 0,
            sheenCount: 0,
            rainbowGlitterCount: 0,
            redGlitterCount: 0,
            fertilizerCount: 0,
            showcasePlantIds: [],
            challenges: {},
            challengesStartDate: Date.now(),
            likes: 0,
            likedUsers: {},
            autoWaterUnlocked: false,
            autoWaterEnabled: false,
            waterRefillCount: 0,
            rubyCount: 0,
            plantChatTokens: 0,
        };

        newGameData.deskPlantIds[0] = 1;


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
        hasRedGlitter: false,
        personality: '',
        chatEnabled: false,
        conversationHistory: [],
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

export async function updateGardenArrangement(userId: string, collectionPlantIds: number[], gardenPlantIds: (number | null)[]) {
    await updateDoc(doc(db, 'users', userId), {
        collectionPlantIds: collectionPlantIds,
        gardenPlantIds: gardenPlantIds
    });
}

export async function updatePlant(userId: string, plantId: number, plantUpdateData: Partial<Plant> | { [key: string]: any }) {
    const userDocRef = doc(db, 'users', userId);
    
    let updates: { [key: string]: any } = {};
    
    if (plantId === 0) {
        updates = { ...plantUpdateData };
    } else {
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

export async function updateUserRubies(userId: string, amount: number) {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        rubyCount: increment(amount)
    });
}

export async function purchaseSprinkler(userId: string, cost: number): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.gold < cost) {
        throw new Error("Not enough gold to purchase.");
    }
     if (gameData.sprinklerUnlocked) {
        throw new Error("Sprinkler already owned.");
    }
    
    await updateDoc(userDocRef, {
        gold: increment(-cost),
        sprinklerUnlocked: true
    });
}

export async function useSprinkler(userId: string): Promise<{ plantsWatered: number; seedsCollected: number; newlyEvolvablePlants: number[] }> {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData) {
        throw new Error("User data not found.");
    }

    const allPlants = Object.values(gameData.plants || {});
    if (allPlants.length === 0) {
        return { plantsWatered: 0, seedsCollected: 0, newlyEvolvablePlants: [] };
    }

    let totalPlantsWatered = 0;
    const newlyEvolvablePlants: number[] = [];
    let seedsToAdd: Seed[] = [];
    const updates: { [key: string]: any } = {};

    for (const plant of allPlants) {
        const timesWateredToday = plant.lastWatered.filter(isToday).length;
        if (timesWateredToday >= MAX_WATERINGS_PER_DAY) {
            continue; // Already fully watered today
        }
        
        const wateringsToApply = MAX_WATERINGS_PER_DAY - timesWateredToday;
        
        let currentXp = plant.xp;
        let currentLevel = plant.level;
        const wasEvolvable = (currentLevel >= EVOLUTION_LEVEL && plant.form === 'Base') || (currentLevel >= 25 && plant.form === 'Evolved');
        const newTimestamps = [...plant.lastWatered];
        
        for (let i = 0; i < wateringsToApply; i++) {
            newTimestamps.push(Date.now() + i); // Add unique timestamp for each watering
            currentXp += XP_PER_WATERING;
            while(currentXp >= XP_PER_LEVEL) {
                currentXp -= XP_PER_LEVEL;
                currentLevel += 1;
                // Add a seed if there's space
                if ((gameData.seeds.length + seedsToAdd.length) < MAX_SEEDS) {
                    seedsToAdd.push({ id: uuidv4(), startTime: Date.now() });
                }
            }
        }
        
        updates[`plants.${plant.id}.xp`] = currentXp;
        updates[`plants.${plant.id}.level`] = currentLevel;
        updates[`plants.${plant.id}.lastWatered`] = newTimestamps;

        const isNowEvolvable = (currentLevel >= EVOLUTION_LEVEL && plant.form === 'Base') || (currentLevel >= 25 && plant.form === 'Evolved');
        if (isNowEvolvable && !wasEvolvable) {
            newlyEvolvablePlants.push(plant.id);
        }
        
        if (wateringsToApply > 0) {
            totalPlantsWatered++;
        }
    }

    if (totalPlantsWatered > 0) {
        if (seedsToAdd.length > 0) {
            updates.seeds = arrayUnion(...seedsToAdd);
        }
        await updateDoc(userDocRef, updates);
    }
    
    return { plantsWatered: totalPlantsWatered, seedsCollected: seedsToAdd.length, newlyEvolvablePlants };
}


export async function purchaseCosmetic(userId: string, cosmetic: 'glitterCount' | 'sheenCount' | 'rainbowGlitterCount' | 'redGlitterCount', quantity: number, cost: number) {
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

export async function purchaseBundle(userId: string, cost: number): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.gold < cost) {
        throw new Error("Not enough gold to purchase the bundle.");
    }

    await updateDoc(userDocRef, {
        gold: increment(-cost),
        glitterCount: increment(1),
        sheenCount: increment(1),
        rainbowGlitterCount: increment(1),
        redGlitterCount: increment(1),
        waterRefillCount: increment(1),
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

export async function useRedGlitter(userId: string) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.redGlitterCount <= 0) {
        throw new Error("No red glitter packs to use.");
    }

    await updateDoc(userDocRef, {
        redGlitterCount: increment(-1)
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
    const newGardenPlantIds = gameData.gardenPlantIds.map(id => (id === plantId ? null : id));
    const newCollectionPlantIds = gameData.collectionPlantIds.filter(id => id !== plantId);
    const newShowcasePlantIds = gameData.showcasePlantIds.filter(id => id !== plantId);

    await updateDoc(userDocRef, {
        plants: remainingPlants,
        deskPlantIds: newDeskPlantIds,
        gardenPlantIds: newGardenPlantIds,
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
    if (likerUid === likedUid) throw new Error("You cannot like yourself.");
    
    const now = Date.now();
    const lastLikedTimestamp = likerData.likedUsers[likedUid];

    if (lastLikedTimestamp && (now - lastLikedTimestamp < ONE_DAY_MS)) {
        throw new Error("You have already liked this user today.");
    }

    const batch = writeBatch(db);
    batch.update(likerDocRef, { [`likedUsers.${likedUid}`]: now });
    batch.update(likedDocRef, {
        likes: increment(1),
        gold: increment(5)
    });
    await batch.commit();
}

export async function purchaseWaterRefill(userId: string, cost: number): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.gold < cost) {
        throw new Error("Not enough gold to purchase.");
    }

    await updateDoc(userDocRef, {
        gold: increment(-cost),
        waterRefillCount: increment(1)
    });
}

export async function useWaterRefill(userId: string, plantId: number): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.waterRefillCount <= 0) {
        throw new Error("No water refills available.");
    }
    
    const plant = gameData.plants[plantId];
    if (!plant) {
        throw new Error("Plant not found.");
    }

    const previousWaterings = plant.lastWatered.filter(ts => !isToday(ts));

    await updateDoc(userDocRef, {
        waterRefillCount: increment(-1),
        [`plants.${plantId}.lastWatered`]: previousWaterings,
    });
}

export async function purchasePlantChat(userId: string, cost: number): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.rubyCount < cost) {
        throw new Error("Not enough rubies to purchase.");
    }
    
    await updateDoc(userDocRef, {
        rubyCount: increment(-cost),
        plantChatTokens: increment(1)
    });
}

export async function unlockPlantChat(userId: string, plantId: number): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.plantChatTokens <= 0) {
        throw new Error("You don't have a Plant Chat token to use.");
    }
    const plant = gameData.plants[plantId];
    if (!plant) {
        throw new Error("Plant not found.");
    }
    if (plant.chatEnabled) {
        throw new Error("Chat is already unlocked for this plant.");
    }

    await updateDoc(userDocRef, {
        plantChatTokens: increment(-1),
        [`plants.${plantId}.chatEnabled`]: true,
    });
}

export async function addConversationHistory(userId: string, plantId: number, userMessage: string, modelMessage: string) {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        [`plants.${plantId}.conversationHistory`]: arrayUnion(
            { role: 'user', content: userMessage },
            { role: 'model', content: modelMessage }
        )
    });
}

export async function addSeed(userId: string): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);
    if (!gameData) return;

    if (gameData.seeds && gameData.seeds.length >= MAX_SEEDS) {
        return; // Seed tray is full
    }

    const newSeed: Seed = {
        id: uuidv4(),
        startTime: Date.now(),
    };

    await updateDoc(userDocRef, {
        seeds: arrayUnion(newSeed)
    });
}

export async function growSeed(userId: string, seedId: string): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);
    if (!gameData || !gameData.seeds) return;

    const seedToRemove = gameData.seeds.find(s => s.id === seedId);
    if (!seedToRemove) return;

    await updateDoc(userDocRef, {
        seeds: arrayRemove(seedToRemove)
    });
}

export async function useFertilizer(userId: string, seedId: string): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);

    if (!gameData || gameData.fertilizerCount <= 0) {
        throw new Error("No fertilizer available.");
    }
    
    const seedToFertilize = gameData.seeds.find(s => s.id === seedId);
    if (!seedToFertilize) {
        throw new Error("Seed not found.");
    }

    const eightHoursInMs = 8 * 60 * 60 * 1000;
    const newStartTime = seedToFertilize.startTime - eightHoursInMs;

    const newSeeds = gameData.seeds.map(s => 
        s.id === seedId ? { ...s, startTime: newStartTime } : s
    );

    await updateDoc(userDocRef, {
        fertilizerCount: increment(-1),
        seeds: newSeeds,
    });
}

export async function awardContestPrize(userId: string): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        redGlitterCount: increment(1),
        gold: increment(50),
    });
}
