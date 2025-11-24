
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
  deleteDoc,
  orderBy,
  limit,
  startAfter,
  Timestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '@/lib/firebase';
import type { Plant, PlantArrangement, User, DailyChallenge, GameData, PlantId, CosmeticId } from '@/lib/types';
import { CHALLENGE_DATA } from '@/challenge-data';
import { प्लांट } from '@/plant-data';
import { cos } from 'react-spring';

export type { Plant, PlantArrangement, User, DailyChallenge, GameData, PlantId, CosmeticId };

const BASE_GOLD_REWARD = 2;

export async function createUserDocument(user: { uid: string; email: string | null }): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const { uid, email } = user;
    const initialUserData: User = {
      email: email || '',
      uid,
      likes: 0,
      showcasePlants: [],
      lastOnline: new Date(),
      // @ts-ignore
      createdAt: new Date(),
    };
    await setDoc(userRef, initialUserData);

    const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
    const initialGameData: GameData = {
      gold: 50,
      draws: 2,
      lastDrawRefill: Date.now(),
      fertilizer: 0,
      waterRefills: 0,
      sprinklers: 0,
      sheen: 0,
      glitter: 0,
      redGlitter: 0,
      rainbowGlitter: 0,
      loginRewards: {
        lastClaimed: 0,
        streak: 0,
      },
      ownedCosmetics: ['plant-pot-brown'],
      ownedPlants: ['plant-pothos'],
      plantChats: [],
      activeChallenges: [],
      completedChallenges: [],
      seasonalCurrency: 0,
    };
    await setDoc(gameDataRef, initialGameData);
  }
}

export async function getUser(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? (userSnap.data() as User) : null;
}

export async function getUserGameData(uid: string): Promise<GameData | null> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  return gameDataSnap.exists() ? (gameDataSnap.data() as GameData) : null;
}

export async function getPlant(uid: string, plantId: string): Promise<Plant | null> {
  const plantRef = doc(db, 'users', uid, 'plants', plantId);
  const plantSnap = await getDoc(plantRef);
  return plantSnap.exists() ? (plantSnap.data() as Plant) : null;
}

export async function getPlants(uid: string): Promise<Plant[]> {
  const plantsRef = collection(db, 'users', uid, 'plants');
  const plantsSnap = await getDocs(plantsRef);
  return plantsSnap.docs.map((doc) => doc.data() as Plant);
}

export async function savePlant(uid: string, plant: Plant): Promise<void> {
  const plantRef = doc(db, 'users', uid, 'plants', plant.id);
  await setDoc(plantRef, plant);
}

export async function deletePlant(uid: string, plantId: string): Promise<void> {
  const plantRef = doc(db, 'users', uid, 'plants', plantId);
  await deleteDoc(plantRef);
}

export async function updatePlant(uid: string, plantId: string, updates: Partial<Plant>): Promise<void> {
  const plantRef = doc(db, 'users', uid, 'plants', plantId);
  await updateDoc(plantRef, updates);
}

export async function getGardenArrangement(uid: string): Promise<PlantArrangement | null> {
  const gardenRef = doc(db, 'users', uid, 'arrangements', 'garden');
  const gardenSnap = await getDoc(gardenRef);
  return gardenSnap.exists() ? (gardenSnap.data() as PlantArrangement) : null;
}

export async function updateGardenArrangement(uid: string, arrangement: PlantArrangement): Promise<void> {
  const gardenRef = doc(db, 'users', uid, 'arrangements', 'garden');
  await setDoc(gardenRef, arrangement, { merge: true });
}

export async function waterPlant(uid: string, plantId: string): Promise<void> {
  const plantRef = doc(db, 'users', uid, 'plants', plantId);
  await updateDoc(plantRef, {
    lastWatered: new Date(),
    isThirsty: false,
  });
}

export async function growSeed(uid: string, seedId: string, plantId: PlantId): Promise<void> {
  const batch = writeBatch(db);

  const seedRef = doc(db, 'users', uid, 'seeds', seedId);
  batch.delete(seedRef);

  const newPlantData: Plant = {
    id: plantId,
    lastWatered: new Date(),
    isThirsty: false,
    isDead: false,
    customImage: null,
    level: 1,
    xp: 0,
    showcased: false,
    hasBeenWatered: false,
    conversations: [],
    fertilizerApplied: false,
    cosmetic: 'plant-pot-brown',
    lastLove: new Date(),
  };

  const plantRef = doc(db, 'users', uid, 'plants', plantId);
  batch.set(plantRef, newPlantData);

  await batch.commit();
}

export async function useFertilizer(uid: string, plantId: string): Promise<{ success: boolean }> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);

  if (gameDataSnap.exists() && gameDataSnap.data().fertilizer > 0) {
    const plantRef = doc(db, 'users', uid, 'plants', plantId);
    await updateDoc(plantRef, {
      fertilizerApplied: true,
    });
    await updateDoc(gameDataRef, {
      fertilizer: increment(-1),
    });
    return { success: true };
  }
  return { success: false };
}

export async function useSprinkler(uid: string): Promise<{ success: boolean }> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);

  if (gameDataSnap.exists() && gameDataSnap.data().sprinklers > 0) {
    const plantsRef = collection(db, 'users', uid, 'plants');
    const plantsSnap = await getDocs(plantsRef);
    const batch = writeBatch(db);

    plantsSnap.forEach((plantDoc) => {
      batch.update(plantDoc.ref, {
        lastWatered: new Date(),
        isThirsty: false,
      });
    });

    await batch.commit();
    await updateDoc(gameDataRef, {
      sprinklers: increment(-1),
    });

    return { success: true };
  }
  return { success: false };
}

export async function claimLoginReward(uid: string): Promise<{
  success: boolean;
  reward?: {
    type: string;
    amount: number;
  };
}> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);

  if (!gameDataSnap.exists()) {
    return { success: false };
  }

  const gameData = gameDataSnap.data() as GameData;

  // If loginRewards is not initialized, create it.
  if (!gameData.loginRewards) {
    gameData.loginRewards = {
      lastClaimed: 0,
      streak: 0,
    };
  }

  const now = new Date();
  const lastClaimed = new Date(gameData.loginRewards.lastClaimed);
  const diffTime = now.getTime() - lastClaimed.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);

  if (diffDays >= 1) {
    let streak = gameData.loginRewards.streak;
    if (diffDays < 2) {
      streak++;
    } else {
      streak = 1;
    }

    const reward = getRewardForStreak(streak);
    await updateDoc(gameDataRef, {
      'loginRewards.lastClaimed': now.getTime(),
      'loginRewards.streak': streak,
      [reward.type]: increment(reward.amount),
    });

    return { success: true, reward };
  }
  return { success: false };
}

function getRewardForStreak(streak: number): {
  type: string;
  amount: number;
} {
  const day = streak % 7 === 0 ? 7 : streak % 7;
  switch (day) {
    case 1:
      return { type: 'gold', amount: 10 };
    case 2:
      return { type: 'fertilizer', amount: 1 };
    case 3:
      return { type: 'waterRefill', amount: 1 };
    case 4:
      return { type: 'sprinkler', amount: 1 };
    case 5:
      return { type: 'sheen', amount: 1 };
    case 6:
      return { type: 'glitter', amount: 1 };
    case 7:
      return { type: 'draws', amount: 1 };
    default:
      return { type: 'gold', amount: 10 };
  }
}

export async function getActiveChallenges(uid: string): Promise<DailyChallenge[]> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  if (gameData.activeChallenges.length < 3) {
    // Not enough active challenges, so let's add some more.
    const numToAdd = 3 - gameData.activeChallenges.length;
    const newChallenges = getNewChallenges(numToAdd, gameData.completedChallenges);

    await updateDoc(gameDataRef, {
      activeChallenges: arrayUnion(...newChallenges),
    });

    return [...gameData.activeChallenges, ...newChallenges];
  }
  return gameData.activeChallenges;
}

function getNewChallenges(num: number, completed: string[]): DailyChallenge[] {
  const available = CHALLENGE_DATA.filter((c) => !completed.includes(c.id));
  const selected: DailyChallenge[] = [];

  for (let i = 0; i < num; i++) {
    if (available.length === 0) break;
    const randomIndex = Math.floor(Math.random() * available.length);
    const challenge = available.splice(randomIndex, 1)[0];
    selected.push({
      ...challenge,
      progress: 0,
    });
  }

  return selected;
}

export async function updateChallengeProgress(uid: string, challengeId: string, progress: number): Promise<void> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  const challenge = gameData.activeChallenges.find((c) => c.id === challengeId);

  if (challenge) {
    challenge.progress = progress;

    await updateDoc(gameDataRef, {
      activeChallenges: gameData.activeChallenges,
    });
  }
}

export async function claimChallengeReward(uid: string, challengeId: string): Promise<{ success: boolean }> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  const challenge = gameData.activeChallenges.find((c) => c.id === challengeId);

  if (challenge && challenge.progress >= challenge.goal) {
    await updateDoc(gameDataRef, {
      activeChallenges: arrayRemove(challenge),
      completedChallenges: arrayUnion(challengeId),
      gold: increment(challenge.reward),
    });
    return { success: true };
  }
  return { success: false };
}

export async function getCommunityPlants(
  startAfterDoc?: any,
  limitNum: number = 10
): Promise<{ plants: Plant[]; lastVisible: any }> {
  let q = query(collection(db, 'community-plants'), orderBy('createdAt', 'desc'), limit(limitNum));

  if (startAfterDoc) {
    q = query(q, startAfter(startAfterDoc));
  }

  const querySnapshot = await getDocs(q);
  const plants = querySnapshot.docs.map((doc) => doc.data() as Plant);
  const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

  return { plants, lastVisible };
}

export async function updateShowcasePlants(uid: string, plantIds: string[]): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    showcasePlants: plantIds,
  });
}

export async function uploadImageAndGetURL(uid: string, plantId: string, file: File): Promise<string> {
  const storage = getStorage();
  const storageRef = ref(storage, `users/${uid}/plants/${plantId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export async function purchaseCosmetic(uid: string, cosmeticId: CosmeticId, cost: number): Promise<{ success: boolean }> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  if (gameData.gold >= cost) {
    await updateDoc(gameDataRef, {
      gold: increment(-cost),
      ownedCosmetics: arrayUnion(cosmeticId),
    });
    return { success: true };
  }
  return { success: false };
}

export async function purchaseWaterRefill(uid: string, cost: number): Promise<{ success: boolean }> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  if (gameData.gold >= cost) {
    await updateDoc(gameDataRef, {
      gold: increment(-cost),
      waterRefills: increment(1),
    });
    return { success: true };
  }
  return { success: false };
}

export async function useWaterRefill(uid: string, plantId: string): Promise<{ success: boolean }> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  if (gameData.waterRefills > 0) {
    const plantRef = doc(db, 'users', uid, 'plants', plantId);
    await updateDoc(plantRef, {
      lastWatered: new Date(),
      isThirsty: false,
    });
    await updateDoc(gameDataRef, {
      waterRefills: increment(-1),
    });
    return { success: true };
  }
  return { success: false };
}

export async function purchaseSprinkler(uid: string, cost: number): Promise<{ success: boolean }> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  if (gameData.gold >= cost) {
    await updateDoc(gameDataRef, {
      gold: increment(-cost),
      sprinklers: increment(1),
    });
    return { success: true };
  }
  return { success: false };
}

export async function useGlitter(uid: string, plantId: string): Promise<{ success: boolean }> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  if (gameData.glitter > 0) {
    const plantRef = doc(db, 'users', uid, 'plants', plantId);
    await updateDoc(plantRef, {
      cosmetic: 'plant-pot-glitter',
    });
    await updateDoc(gameDataRef, {
      glitter: increment(-1),
    });
    return { success: true };
  }
  return { success: false };
}

export async function useSheen(uid: string, plantId: string): Promise<{ success: boolean }> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  if (gameData.sheen > 0) {
    const plantRef = doc(db, 'users', uid, 'plants', plantId);
    await updateDoc(plantRef, {
      cosmetic: 'plant-pot-sheen',
    });
    await updateDoc(gameDataRef, {
      sheen: increment(-1),
    });
    return { success: true };
  }
  return { success: false };
}

export async function useRedGlitter(uid: string, plantId: string): Promise<{ success: boolean }> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  if (gameData.redGlitter > 0) {
    const plantRef = doc(db, 'users', uid, 'plants', plantId);
    await updateDoc(plantRef, {
      cosmetic: 'plant-pot-red-glitter',
    });
    await updateDoc(gameDataRef, {
      redGlitter: increment(-1),
    });
    return { success: true };
  }
  return { success: false };
}

export async function useRainbowGlitter(uid: string, plantId: string): Promise<{ success: boolean }> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  if (gameData.rainbowGlitter > 0) {
    const plantRef = doc(db, 'users', uid, 'plants', plantId);
    await updateDoc(plantRef, {
      cosmetic: 'plant-pot-rainbow-glitter',
    });
    await updateDoc(gameDataRef, {
      rainbowGlitter: increment(-1),
    });
    return { success: true };
  }
  return { success: false };
}

export async function purchasePlantChat(uid: string, plantId: PlantId): Promise<{ success: boolean, reason?: 'not_enough_gold' | 'already_owned' }> {
  const plantData = प्लांट[plantId];
  if (!plantData) {
    throw new Error(`Plant with id ${plantId} not found`);
  }
  const cost = plantData.chatCost;

  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  if (gameData.plantChats.includes(plantId)) {
    return { success: false, reason: 'already_owned' };
  }
  
  if (gameData.gold >= cost) {
    await updateDoc(gameDataRef, {
      gold: increment(-cost),
      plantChats: arrayUnion(plantId),
    });
    return { success: true };
  }
  return { success: false, reason: 'not_enough_gold' };
}

export async function unlockPlantChat(uid: string, plantId: PlantId): Promise<void> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  await updateDoc(gameDataRef, {
    plantChats: arrayUnion(plantId),
  });
}

export async function addConversationHistory(uid: string, plantId: PlantId, message: string, response: string): Promise<void> {
  const plantRef = doc(db, 'users', uid, 'plants', plantId);
  await updateDoc(plantRef, {
    conversations: arrayUnion({
      sentAt: new Date(),
      message,
      response,
    }),
  });
}

export async function purchaseBundle(
  uid: string,
  bundle: {
    id: string;
    items: {
      type: 'fertilizer' | 'waterRefill' | 'sprinkler' | 'sheen' | 'glitter' | 'redGlitter' | 'rainbowGlitter';
      amount: number;
    }[];
    cost: number;
  }
): Promise<{ success: boolean, reason?: 'not_enough_gold' }> {
  const gameDataRef = doc(db, 'users', uid, 'game-data', 'data');
  const gameDataSnap = await getDoc(gameDataRef);
  const gameData = gameDataSnap.data() as GameData;

  if (gameData.gold >= bundle.cost) {
    const updates = bundle.items.reduce(
      (acc, item) => ({
        ...acc,
        [item.type]: increment(item.amount),
      }),
      {}
    );
    updates.gold = increment(-bundle.cost);

    await updateDoc(gameDataRef, updates);
    return { success: true };
  }
  return { success: false, reason: 'not_enough_gold' };
}

export async function updatePlantArrangement(uid: string, arrangementId: string, arrangement: PlantArrangement): Promise<void> {
  const arrangementRef = doc(db, 'users', uid, 'arrangements', arrangementId);
  await setDoc(arrangementRef, arrangement, { merge: true });
}

export async function likeUser(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    likes: increment(1),
  });
}

export const purchaseTimeReducer = async (userId: string) => {
  const userDocRef = doc(db, 'users', userId);
  const gamedataDocRef = doc(db, 'users', userId, 'game-data', 'data');

  try {
    const gamedataSnapshot = await getDoc(gamedataDocRef);

    if (!gamedataSnapshot.exists()) {
      throw new Error(`Game data does not exist for user ${userId}`);
    }

    const currentFertilizer = gamedataSnapshot.data().fertilizer || 0;

    await updateDoc(gamedataDocRef, {
      fertilizer: currentFertilizer + 5,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    throw new Error(`Failed to reduce purchase time for user ${userId}: ${message}`);
  }
};

export const purchaseSeasonalPlantPack = async (userId: string) => {
  const userDocRef = doc(db, 'users', userId);
  const gamedataDocRef = doc(db, 'users', userId, 'game-data', 'data');

  try {
    const gamedataSnapshot = await getDoc(gamedataDocRef);

    if (!gamedataSnapshot.exists()) {
      throw new Error(`Game data does not exist for user ${userId}`);
    }

    const currentSeasonalCurrency = gamedataSnapshot.data().seasonalCurrency || 0;

    await updateDoc(gamedataDocRef, {
      seasonalCurrency: currentSeasonalCurrency + 25,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    throw new Error(`Failed to purchase seasonal plant pack for user ${userId}: ${message}`);
  }
};
