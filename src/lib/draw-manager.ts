
'use client';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { GameData } from './firestore';
import { getUserGameData } from './firestore';

export const MAX_DRAWS = 2;
const REFILL_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export async function loadDraws(userId: string): Promise<number> {
  const gameData = await getUserGameData(userId);
  if (!gameData) return 0;

  const now = Date.now();
  const lastRefill = gameData.lastDrawRefill || now;
  const currentDraws = gameData.draws || 0;

  const timeSinceUpdate = now - lastRefill;

  if (timeSinceUpdate > REFILL_INTERVAL && currentDraws < MAX_DRAWS) {
    const drawsToAdd = Math.floor(timeSinceUpdate / REFILL_INTERVAL);
    const newCount = Math.min(currentDraws + drawsToAdd, MAX_DRAWS);
    const newLastUpdated = lastRefill + (drawsToAdd * REFILL_INTERVAL);
    
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        draws: newCount,
        lastDrawRefill: newLastUpdated,
    });
    return newCount;
  }

  return currentDraws;
}

export async function useDraw(userId: string) {
    const gameData = await getUserGameData(userId);
    if (!gameData) return;

    if (gameData.draws > 0) {
        const newCount = gameData.draws - 1;
        const newLastUpdated = (gameData.draws === MAX_DRAWS) ? Date.now() : gameData.lastDrawRefill;
        
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            draws: newCount,
            lastDrawRefill: newLastUpdated,
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

export async function claimFreeDraw(userId: string, options?: { bypassTimeCheck?: boolean }): Promise<{ success: boolean; newCount: number; reason?: 'max_draws' | 'already_claimed' }> {
  const gameData = await getUserGameData(userId);
  if (!gameData) return { success: false, newCount: 0 };
  
  const currentDraws = gameData.draws || 0;

  if (currentDraws >= MAX_DRAWS) {
    return { success: false, newCount: currentDraws, reason: 'max_draws' };
  }
  
  if (!options?.bypassTimeCheck && await hasClaimedDailyDraw(userId)) {
    return { success: false, newCount: currentDraws, reason: 'already_claimed' };
  }

  const newCount = currentDraws + 1;
  const now = Date.now();
  
  const userDocRef = doc(db, 'users', userId);
  const updateData: Partial<GameData> = {
      draws: newCount,
  };
  
  if (!options?.bypassTimeCheck) {
      updateData.lastFreeDrawClaimed = now;
  }

  await updateDoc(userDocRef, updateData);

  return { success: true, newCount: newCount };
}
