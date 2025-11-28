
'use client';

import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
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
    const gameData = await getUserGameData(userId);
    if (!gameData) return;

    if (gameData.draws < MAX_DRAWS) {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            draws: increment(1)
        });
    }
}

export async function claimFreeDraw(userId: string, options?: { useGold?: boolean, cost?: number }): Promise<{ success: boolean; newCount: number; reason?: 'max_draws' | 'not_enough_gold' }> {
  const userDocRef = doc(db, 'users', userId);
  const gameData = await getUserGameData(userId);
  if (!gameData) return { success: false, newCount: 0 };

  const currentDraws = gameData.draws ?? 0;

  if (currentDraws >= MAX_DRAWS) {
    // Even if draws are full, we may need to update the timer if it's the first time claiming today
    // and there's no specific gold cost associated (i.e., it's a free ad-based draw).
    if (!options?.useGold) {
        await updateDoc(userDocRef, { lastDrawRefill: Date.now() });
    }
    return { success: false, newCount: currentDraws, reason: 'max_draws' };
  }
  
  if (options?.useGold && gameData.gold < (options.cost || 0)) {
      return { success: false, newCount: currentDraws, reason: 'not_enough_gold' };
  }

  const newCount = currentDraws + 1;
  const now = Date.now();
  
  const updateData: any = {
      draws: newCount,
  };
  
  if (options?.useGold && options.cost && options.cost > 0) {
      updateData.gold = increment(-options.cost);
  }
  
  // If we just added the last draw to become full, the timer is now irrelevant until a draw is used.
  // We can set it to now, which correctly reflects the state.
  if (newCount === MAX_DRAWS) {
      updateData.lastDrawRefill = now;
  }

  await updateDoc(userDocRef, updateData);

  return { success: true, newCount: newCount };
}
