

import {
  db,
} from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  increment,
  arrayUnion,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import type {
  Plant,
  GameData
} from '@/interfaces/plant';
import {
  DrawPlantOutput
} from '@/interfaces/plant';


// Helper to check if a Firestore timestamp is from today
function isToday(timestamp: number): boolean {
  if (!timestamp) return false;
  const today = new Date();
  const someDate = new Date(timestamp);
  return someDate.getDate() === today.getDate() &&
    someDate.getMonth() === today.getMonth() &&
    someDate.getFullYear() === today.getFullYear();
}

export async function createUserDocument(user: {
  uid: string;email: string | null, displayName ? : string | null
}, referrerId ? : string): Promise < GameData > {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const {
      uid,
      email,
      displayName
    } = user;

    const avatarColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 85%)`;

    const initialUserData: GameData = {
      email: email || '',
      username: displayName || 'PlantLover',
      uid,
      likes: 0,
      gold: 50,
      rubyCount: 0,
      showcasePlantIds: [],
      lastLoginBonusClaimed: 0,
      loginStreak: 0,
      draws: 2,
      lastDrawRefill: Date.now(),
      glitterCount: 0,
      sheenCount: 0,
      rainbowGlitterCount: 0,
      redGlitterCount: 0,
      waterRefillCount: 0,
      fertilizerCount: 0,
      sprinklerUnlocked: false,
      plantChatTokens: 0,
      seedBagSize: 3,
      challenges: {},
      challengesStartDate: Date.now(),
      createdAt: Timestamp.now(),
      avatarColor: avatarColor,
      plants: {},
      deskPlantIds: Array(3).fill(null),
      gardenPlantIds: Array(12).fill(null),
      collectionPlantIds: [],
      seeds: [],
      likedUsers: {},
      seenPopups: [],
    };
    await setDoc(userRef, initialUserData);

    if (referrerId) {
      const referrerRef = doc(db, 'users', referrerId);
      const referrerSnap = await getDoc(referrerRef);
      if (referrerSnap.exists()) {
        await updateDoc(referrerRef, {
          seedBagSize: increment(3)
        });
      }
    }

    return initialUserData as GameData;
  }
  return userSnap.data() as GameData;
}

export async function getUserGameData(uid: string): Promise < GameData | null > {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? (userSnap.data() as GameData) : null;
}

export async function savePlant(uid: string, plantData: DrawPlantOutput): Promise < Plant > {
  const userRef = doc(db, 'users', uid);

  let newPlant: Plant | null = null;

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw new Error("User document does not exist.");
    }
    const userData = userDoc.data() as GameData;
    const allPlants = userData.plants || {};

    const nextId = (Object.keys(allPlants).reduce((maxId, id) => Math.max(parseInt(id, 10), maxId), 0) + 1);

    const imageUrl = await uploadImageAndGetURL(uid, nextId, plantData.imageDataUri);

    newPlant = {
      id: nextId,
      name: plantData.name,
      description: plantData.description,
      image: imageUrl,
      hint: plantData.hint || '',
      level: 1,
      xp: 0,
      form: 'Base',
      baseImage: '',
      lastWatered: [],
      hasGlitter: false,
      hasSheen: false,
      hasRainbowGlitter: false,
      hasRedGlitter: false,
      personality: '',
      chatEnabled: false,
      conversationHistory: [],
      acquiredDate: new Date().toISOString(),
    };

    transaction.update(userRef, {
      [`plants.${nextId}`]: newPlant,
      'collectionPlantIds': arrayUnion(nextId),
    });
  });

  if (!newPlant) {
    throw new Error("Failed to create new plant in transaction.");
  }
  return newPlant;
}


export async function claimLoginReward(uid: string, newStreak: number, reward: {
  type: string, amount: number
}): Promise < void > {
  const userRef = doc(db, 'users', uid);

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const gameData = userDoc.data() as GameData;
    const lastClaimed = gameData.lastLoginBonusClaimed || 0;

    if (isToday(lastClaimed)) {
      throw new Error("Login reward for today has already been claimed.");
    }

    const updateData: {
      [key: string]: any
    } = {
      loginStreak: newStreak,
      lastLoginBonusClaimed: Date.now()
    };

    if (reward.type === 'draws') {
      updateData.draws = increment(reward.amount);
    } else {
      updateData[reward.type] = increment(reward.amount);
    }

    transaction.update(userRef, updateData);
  });
}


export async function getCommunityUsers(): Promise < any[] > {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('likes', 'desc'), limit(20));
  const snapshot = await getDocs(q);

  const users = snapshot.docs.map(doc => {
    const data = doc.data();
    const allPlants = data.plants || {};
    const showcasePlantIds = data.showcasePlantIds || [];

    const showcasePlants = showcasePlantIds
      .map((id: number) => allPlants[id])
      .filter(Boolean);

    return {
      uid: doc.id,
      username: data.username,
      avatarColor: data.avatarColor,
      showcasePlants: showcasePlants,
      likes: data.likes || 0,
      gold: data.gold || 0,
    }
  });

  return users;
}

export async function likeUser(likerId: string, likedUserId: string): Promise < void > {
  const likedUserRef = doc(db, 'users', likedUserId);
  const likerRef = doc(db, 'users', likerId);

  await runTransaction(db, async (transaction) => {
    const likerDoc = await transaction.get(likerRef);
    if (!likerDoc.exists()) throw new Error("Liker does not exist.");

    const likedUsers = likerDoc.data() !.likedUsers || {};
    const lastLikedTimestamp = likedUsers[likedUserId];

    if (lastLikedTimestamp && (Date.now() - lastLikedTimestamp < 24 * 60 * 60 * 1000)) {
      throw new Error("You have already liked this user today.");
    }

    transaction.update(likedUserRef, {
      likes: increment(1),
      gold: increment(5)
    });

    transaction.update(likerRef, {
      [`likedUsers.${likedUserId}`]: Date.now()
    });
  });
}


export async function updateShowcasePlants(uid: string, plantIds: number[]): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    showcasePlantIds: plantIds
  });
}

export async function updatePlantArrangement(uid: string, collectionPlantIds: (number | null)[], deskPlantIds: (number | null)[]): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    collectionPlantIds: collectionPlantIds.filter(id => id !== null),
    deskPlantIds: deskPlantIds
  });
}

export async function updateGardenArrangement(uid: string, collectionPlantIds: (number | null)[], gardenPlantIds: (number | null)[]): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    collectionPlantIds: collectionPlantIds.filter(id => id !== null),
    gardenPlantIds: gardenPlantIds
  });
}


export async function waterPlant(uid: string, plantId: number): Promise<{
    leveledUp: boolean,
    newLevel?: number,
    xpGained: number,
    seedCollected: boolean
}> {
    const userRef = doc(db, 'users', uid);
    let leveledUp = false;
    let newLevel: number | undefined = undefined;
    let xpGained = 0;
    let seedCollected = false;

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User document does not exist.");

        const gameData = userDoc.data() as GameData;
        const plant = gameData.plants[plantId];

        if (!plant) throw new Error("Plant not found.");
        if (plant.level >= 50) throw new Error("This plant is at the max level.");

        const timesWateredToday = plant.lastWatered.filter(ts => isToday(ts as any)).length;
        if (timesWateredToday >= 4) {
            throw new Error("This plant has been watered enough for today.");
        }

        xpGained = 250;
        const combinedXp = plant.xp + xpGained;
        const updates: any = {};

        if (combinedXp >= 1000) {
            const levelsGained = Math.floor(combinedXp / 1000);
            newLevel = plant.level + levelsGained;
            const remainingXp = combinedXp % 1000;

            leveledUp = true;
            updates[`plants.${plantId}.level`] = newLevel;
            updates[`plants.${plantId}.xp`] = remainingXp;
            
            const currentSeeds = gameData.seeds || [];
            const seedBagSize = gameData.seedBagSize || 3;
            if (currentSeeds.length < seedBagSize) {
                seedCollected = true;
                const newSeedId = `seed_${Date.now()}`;
                updates.seeds = arrayUnion({
                    id: newSeedId,
                    startTime: Date.now(),
                });
            }
        } else {
            updates[`plants.${plantId}.xp`] = combinedXp;
        }

        updates[`plants.${plantId}.lastWatered`] = arrayUnion(Timestamp.fromMillis(Date.now()));
        updates.gold = increment(5);

        transaction.update(userRef, updates);
    });

    return { leveledUp, newLevel, xpGained, seedCollected };
}


export async function useWaterRefill(uid: string, plantId: number): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User not found.");

    const gameData = userDoc.data() as GameData;
    if (gameData.waterRefillCount <= 0) {
      throw new Error("You have no water refills.");
    }

    const plant = gameData.plants[plantId];
    const timesWateredToday = plant.lastWatered.filter(ts => isToday(ts as any)).length;
    if (timesWateredToday < 4) {
      throw new Error("You can still water this plant without a refill.");
    }

    const oldTimestamps = plant.lastWatered.filter(ts => !isToday(ts as any));

    transaction.update(userRef, {
      waterRefillCount: increment(-1),
      [`plants.${plantId}.lastWatered`]: oldTimestamps
    });
  });
}

export async function useSprinkler(uid: string): Promise<{
    plantsWatered: number,
    seedsCollected: number,
    newlyEvolvablePlants: { id: number, name: string }[]
}> {
    const userRef = doc(db, 'users', uid);
    let plantsWatered = 0;
    let seedsCollected = 0;
    let newlyEvolvablePlants: { id: number, name: string }[] = [];

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found.");

        const gameData = userDoc.data() as GameData;
        const allPlants = gameData.plants;
        const updates: any = {};
        
        const seedsToAdd: any[] = [];
        let currentSeedCount = (gameData.seeds || []).length;
        const seedBagSize = gameData.seedBagSize || 3;

        Object.values(allPlants).forEach(plant => {
            const timesWateredToday = plant.lastWatered.filter(ts => isToday(ts as any)).length;
            if (plant.level < 50 && timesWateredToday < 4) {
                plantsWatered++;
                const xpGained = 250;
                const combinedXp = plant.xp + xpGained;
                const oldLevel = plant.level;

                updates[`plants.${plant.id}.lastWatered`] = arrayUnion(Timestamp.fromMillis(Date.now()));

                if (combinedXp >= 1000) {
                    const levelsGained = Math.floor(combinedXp / 1000);
                    const newLevel = plant.level + levelsGained;
                    const remainingXp = combinedXp % 1000;

                    updates[`plants.${plant.id}.level`] = newLevel;
                    updates[`plants.${plant.id}.xp`] = remainingXp;
                    
                    if (currentSeedCount < seedBagSize) {
                        seedsCollected++;
                        currentSeedCount++;
                        seedsToAdd.push({
                            id: `seed_${Date.now()}_${plant.id}`,
                            startTime: Date.now()
                        });
                    }

                    const justReachedEvo1 = oldLevel < 10 && newLevel >= 10 && plant.form === 'Base';
                    const justReachedEvo2 = oldLevel < 25 && newLevel >= 25 && plant.form === 'Evolved';

                    if (justReachedEvo1 || justReachedEvo2) {
                        newlyEvolvablePlants.push({
                            id: plant.id,
                            name: plant.name
                        });
                    }
                } else {
                    updates[`plants.${plant.id}.xp`] = combinedXp;
                }
            }
        });

        if (plantsWatered > 0) {
            updates.gold = increment(plantsWatered * 5);
            if (seedsToAdd.length > 0) {
                updates.seeds = arrayUnion(...seedsToAdd);
            }
            transaction.update(userRef, updates);
        }
    });

    return { plantsWatered, seedsCollected, newlyEvolvablePlants };
}

export async function deletePlant(uid: string, plantId: number): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User not found.");

    const gameData = userDoc.data() as GameData;
    const plants = { ...gameData.plants
    };
    delete plants[plantId];

    const newDeskIds = gameData.deskPlantIds.map(id => id === plantId ? null : id);
    const newCollectionIds = gameData.collectionPlantIds.filter(id => id !== plantId);

    transaction.update(userRef, {
      plants,
      deskPlantIds: newDeskIds,
      collectionPlantIds: newCollectionIds
    });
  });
}

export async function updatePlant(uid: string, plantId: number, data: Partial < Plant > ): Promise < void > {
  const userRef = doc(db, 'users', uid);
  const updates: {
    [key: string]: any
  } = {};
  for (const key in data) {
    updates[`plants.${plantId}.${key}`] = (data as any)[key];
  }
  await updateDoc(userRef, updates);
}

export async function uploadImageAndGetURL(uid: string, plantId: number, dataUri: string): Promise < string > {
  const storage = getStorage();
  const storageRef = ref(storage, `users/${uid}/plants/${plantId}/${Date.now()}.jpg`);

  const response = await fetch(dataUri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob, {
    contentType: 'image/jpeg'
  });
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export async function useGlitter(uid: string): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    glitterCount: increment(-1)
  });
}

export async function useSheen(uid: string): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    sheenCount: increment(-1)
  });
}

export async function useRainbowGlitter(uid: string): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    rainbowGlitterCount: increment(-1)
  });
}

export async function useRedGlitter(uid: string): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    redGlitterCount: increment(-1)
  });
}


export async function purchaseCosmetic(uid: string, cosmeticType: 'glitterCount' | 'sheenCount' | 'rainbowGlitterCount' | 'redGlitterCount', amount: number, cost: number): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    [cosmeticType]: increment(amount),
    gold: increment(-cost)
  });
}

export async function purchaseSprinkler(uid: string, cost: number): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    sprinklerUnlocked: true,
    gold: increment(-cost)
  });
}

export async function purchaseWaterRefill(uid: string, cost: number): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    waterRefillCount: increment(1),
    gold: increment(-cost)
  });
}

export async function purchaseBundle(uid: string, cost: number): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    glitterCount: increment(1),
    sheenCount: increment(1),
    rainbowGlitterCount: increment(1),
    redGlitterCount: increment(1),
    waterRefillCount: increment(1),
    gold: increment(-cost),
  });
}

export async function purchasePlantChat(uid: string, cost: number): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    plantChatTokens: increment(1),
    rubyCount: increment(-cost)
  });
}

export async function updateUserRubies(uid: string, amount: number): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    rubyCount: increment(amount)
  });
}


export async function unlockPlantChat(uid: string, plantId: number): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User not found.");

    const gameData = userDoc.data() as GameData;
    if (gameData.plantChatTokens <= 0) {
      throw new Error("You do not have any Plant Chat tokens.");
    }

    transaction.update(userRef, {
      plantChatTokens: increment(-1),
      [`plants.${plantId}.chatEnabled`]: true
    });
  });
}

export async function addConversationHistory(uid: string, plantId: number, userMessage: string, modelResponse: string): Promise < void > {
  const userRef = doc(db, 'users', uid);

  const userTurn = {
    role: 'user',
    content: userMessage
  };
  const modelTurn = {
    role: 'model',
    content: modelResponse
  };

  await updateDoc(userRef, {
    [`plants.${plantId}.conversationHistory`]: arrayUnion(userTurn, modelTurn)
  });
}


export async function addSeed(uid: string): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User not found.");

    const gameData = userDoc.data() as GameData;
    if (gameData.seeds.length >= gameData.seedBagSize) {
      return;
    }

    const newSeed = {
      id: `seed_${Date.now()}`,
      startTime: Date.now()
    };

    transaction.update(userRef, {
      seeds: arrayUnion(newSeed)
    });
  });
}

export async function growSeed(uid: string, seedId: string): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User not found.");
    const gameData = userDoc.data() as GameData;

    const newSeeds = gameData.seeds.filter(seed => seed.id !== seedId);

    transaction.update(userRef, {
      seeds: newSeeds
    });
  });
}

export async function useFertilizer(uid: string, seedId: string): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User not found.");
    const gameData = userDoc.data() as GameData;

    if (gameData.fertilizerCount <= 0) {
      throw new Error("You have no fertilizer.");
    }

    const seeds = gameData.seeds;
    const seedIndex = seeds.findIndex(s => s.id === seedId);

    if (seedIndex === -1) {
      throw new Error("Seed not found.");
    }

    seeds[seedIndex].startTime -= 8 * 60 * 60 * 1000;

    transaction.update(userRef, {
      fertilizerCount: increment(-1),
      seeds: seeds
    });
  });
}

export async function awardContestPrize(userId: string) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    gold: increment(50),
    redGlitterCount: increment(1)
  });
}


export async function purchaseTimeReducer(userId: string) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    fertilizerCount: increment(1)
  });
}

export async function purchaseSeasonalPlantPack(userId: string) {
  const userRef = doc(db, 'users', uid);

  let newPlant: Plant | null = null;

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw new Error("User document does not exist.");
    }
    const userData = userDoc.data() as GameData;
    const allPlants = userData.plants || {};

    const nextId = (Object.keys(allPlants).reduce((maxId, id) => Math.max(parseInt(id, 10), maxId), 0) + 1);

    newPlant = {
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
      'collectionPlantIds': arrayUnion(nextId),
    });
  });
}

export async function markPopupAsSeen(uid: string, popupId: string): Promise < void > {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    seenPopups: arrayUnion(popupId)
  });
}
