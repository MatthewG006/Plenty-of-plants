
'use client';

import { doc, getDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import type { GameData } from '@/interfaces/plant';
import { getUserGameData } from './firestore';

export const MAX_DRAWS = 2;
const REFILL_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export async function refillDraws(userId: string): Promise<number> {
  const gameData = await getUserGameData(userId);
  if (!gameData) return 0;
  
  const now = Date.now();
  const lastRefill = gameData.lastDrawRefill || now;
  const timeSinceRefill = now - lastRefill;

  if (timeSinceRefill < REFILL_INTERVAL) {
      return 0; // Not enough time has passed for even one refill.
  }

  const drawsToAdd = Math.floor(timeSinceRefill / REFILL_INTERVAL);
  const newLastRefill = lastRefill + (drawsToAdd * REFILL_INTERVAL);
  
  const currentDraws = gameData.draws;
  
  if (currentDraws >= MAX_DRAWS) {
    // If draws are already full, we don't add any, but we MUST update the timestamp
    // to prevent getting stuck.
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { lastDrawRefill: newLastRefill });
    return 0;
  }
  
  const newDrawsTotal = Math.min(currentDraws + drawsToAdd, MAX_DRAWS);
  const drawsActuallyAdded = newDrawsTotal - currentDraws;

  if (drawsActuallyAdded > 0) {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      draws: newDrawsTotal,
      lastDrawRefill: newLastRefill,
    });
  }
  
  return drawsActuallyAdded;
}

export async function useDraw(userId: string) {
    const gameData = await getUserGameData(userId);
    if (!gameData) return;

    if (gameData.draws > 0) {
        const newCount = gameData.draws - 1;
        const updatePayload: { draws: number, lastDrawRefill?: number } = { draws: newCount };

        // If we were at max draws, this is the first time we've used one, so start the timer.
        if (gameData.draws === MAX_DRAWS) {
            updatePayload.lastDrawRefill = Date.now();
        }
        
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, updatePayload);
    }
}

export async function refundDraw(userId: string) {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        draws: increment(1)
    });
}

export async function claimFreeDraw(userId: string, options?: { useGold?: boolean, cost?: number }): Promise<{ success: boolean; newCount: number; reason?: string }> {
  const userDocRef = doc(db, 'users', userId);

  try {
    return await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      if (!userDoc.exists()) {
        throw new Error("User document does not exist.");
      }

      const gameData = userDoc.data() as GameData;
      let currentDraws = gameData.draws ?? 0;

      if (options?.useGold) {
        const cost = options.cost || 0;
        if ((gameData.gold ?? 0) < cost) {
          return { success: false, newCount: currentDraws, reason: 'not_enough_gold' };
        }
      }

      if (currentDraws >= MAX_DRAWS) {
        return { success: false, newCount: currentDraws, reason: 'max_draws' };
      }

      const newCount = currentDraws + 1;
      const updateData: { [key: string]: any } = { draws: newCount };

      if (options?.useGold) {
        updateData.gold = increment(-(options.cost || 0));
      }
      
      if (newCount === MAX_DRAWS) {
        updateData.lastDrawRefill = Date.now();
      }

      transaction.update(userDocRef, updateData);

      return { success: true, newCount: newCount };
    });
  } catch (error: any) {
    console.error("claimFreeDraw transaction failed: ", error);
    return { success: false, newCount: 0, reason: error.message || "An unexpected error occurred." };
  }
}
