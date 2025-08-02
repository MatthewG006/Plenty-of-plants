
'use client';

import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import type { GameData } from './firestore';
import { getUserGameData } from './firestore';

export const MAX_DRAWS = 2;
const REFILL_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export async function refillDraws(userId: string): Promise<number> {
  const gameData = await getUserGameData(userId);
  if (!gameData) return 0;
  
  const now = Date.now();
  let currentDraws = gameData.draws;
  let drawsAdded = 0;
  
  if (currentDraws < MAX_DRAWS) {
    const lastRefill = gameData.lastDrawRefill || now;
    const timeSinceRefill = now - lastRefill;

    if (timeSinceRefill >= REFILL_INTERVAL) {
      const drawsToAdd = Math.floor(timeSinceRefill / REFILL_INTERVAL);
      const newDraws = Math.min(currentDraws + drawsToAdd, MAX_DRAWS);
      drawsAdded = newDraws - currentDraws;

      if (drawsAdded > 0) {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          draws: newDraws,
          lastDrawRefill: now,
        });
      }
    }
  }
  return drawsAdded;
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

export async function hasClaimedDailyDraw(userId: string): Promise<boolean> {
    const gameData = await getUserGameData(userId);
    if (!gameData || !gameData.lastFreeDrawClaimed) {
        return false;
    }
    const lastClaimDate = new Date(gameData.lastFreeDrawClaimed).toDateString();
    const todayDate = new Date().toDateString();
    return lastClaimDate === todayDate;
}

export async function claimFreeDraw(userId: string, options?: { bypassTimeCheck?: boolean, cost?: number }): Promise<{ success: boolean; newCount: number; reason?: 'max_draws' | 'already_claimed' | 'not_enough_gold' }> {
  const gameData = await getUserGameData(userId);
  if (!gameData) return { success: false, newCount: 0 };
  
  let currentDraws = gameData.draws || 0;

  if (currentDraws >= MAX_DRAWS) {
    return { success: false, newCount: currentDraws, reason: 'max_draws' };
  }
  
  if (!options?.bypassTimeCheck && await hasClaimedDailyDraw(userId)) {
    return { success: false, newCount: currentDraws, reason: 'already_claimed' };
  }
  
  if (options?.cost && gameData.gold < options.cost) {
      return { success: false, newCount: currentDraws, reason: 'not_enough_gold' };
  }

  const newCount = currentDraws + 1;
  const now = Date.now();
  
  const userDocRef = doc(db, 'users', userId);
  const updateData: any = {
      draws: newCount,
  };
  
  if (!options?.bypassTimeCheck) {
      updateData.lastFreeDrawClaimed = now;
  }
  
  if (options?.cost && options.cost > 0) {
      updateData.gold = increment(-options.cost);
  }
  
  // If we just added the last draw to become full, we don't need a timer.
  if (newCount === MAX_DRAWS) {
      updateData.lastDrawRefill = now;
  }

  await updateDoc(userDocRef, updateData);

  return { success: true, newCount: newCount };
}

    