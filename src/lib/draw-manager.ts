
'use client';

const DRAWS_STORAGE_KEY = 'plenty-of-plants-draws';
export const MAX_DRAWS = 2;
const REFILL_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

interface DrawData {
  count: number;
  lastUpdated: number;
  lastFreeDrawClaimed?: number;
}

export function getStoredDraws(): DrawData {
  try {
    const storedDrawsRaw = localStorage.getItem(DRAWS_STORAGE_KEY);
    if (storedDrawsRaw) {
      const storedDraws = JSON.parse(storedDrawsRaw);
      // Basic validation
      if (typeof storedDraws.count === 'number' && typeof storedDraws.lastUpdated === 'number') {
        return {
            count: storedDraws.count,
            lastUpdated: storedDraws.lastUpdated,
            lastFreeDrawClaimed: storedDraws.lastFreeDrawClaimed
        };
      }
    }
  } catch (e) {
    console.error("Failed to read or parse draws from localStorage", e);
  }
  // Return default if nothing is stored or data is invalid
  return { count: MAX_DRAWS, lastUpdated: Date.now() };
}

function saveDraws(data: DrawData) {
  try {
    localStorage.setItem(DRAWS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save draws to localStorage", e);
  }
}

export function loadDraws(): number {
  const draws = getStoredDraws();
  const now = Date.now();
  const timeSinceUpdate = now - draws.lastUpdated;

  if (timeSinceUpdate > REFILL_INTERVAL && draws.count < MAX_DRAWS) {
    const drawsToAdd = Math.floor(timeSinceUpdate / REFILL_INTERVAL);
    const newCount = Math.min(draws.count + drawsToAdd, MAX_DRAWS);
    const newLastUpdated = draws.lastUpdated + (drawsToAdd * REFILL_INTERVAL);
    
    saveDraws({ ...draws, count: newCount, lastUpdated: newLastUpdated });
    return newCount;
  }

  return draws.count;
}

export function useDraw() {
    const draws = getStoredDraws();
    if (draws.count > 0) {
        const newCount = draws.count - 1;
        // If we just used the last draw that was maxed out, reset the timer
        const newLastUpdated = (draws.count === MAX_DRAWS) ? Date.now() : draws.lastUpdated;
        
        const newDrawsData = { ...draws, count: newCount, lastUpdated: newLastUpdated };
        saveDraws(newDrawsData);
        // Manually dispatch a storage event to notify other open tabs
        window.dispatchEvent(new StorageEvent('storage', {
            key: DRAWS_STORAGE_KEY,
            newValue: JSON.stringify(newDrawsData),
        }));
    }
}

export function hasClaimedDailyDraw(): boolean {
    const draws = getStoredDraws();
    if (!draws.lastFreeDrawClaimed) {
        return false;
    }
    const lastClaimDate = new Date(draws.lastFreeDrawClaimed).toDateString();
    const todayDate = new Date().toDateString();
    return lastClaimDate === todayDate;
}

export function claimFreeDraw(options?: { bypassTimeCheck?: boolean }): { success: boolean, newCount: number, reason?: 'max_draws' | 'already_claimed' } {
  const draws = getStoredDraws();

  if (draws.count >= MAX_DRAWS) {
    return { success: false, newCount: draws.count, reason: 'max_draws' };
  }
  
  if (!options?.bypassTimeCheck && hasClaimedDailyDraw()) {
    return { success: false, newCount: draws.count, reason: 'already_claimed' };
  }

  const newCount = draws.count + 1;
  const now = Date.now();

  const newDrawsData: DrawData = {
    ...draws,
    count: newCount,
    lastFreeDrawClaimed: options?.bypassTimeCheck ? draws.lastFreeDrawClaimed : now,
  };
  saveDraws(newDrawsData);

  window.dispatchEvent(new StorageEvent('storage', {
    key: DRAWS_STORAGE_KEY,
    newValue: JSON.stringify(newDrawsData),
  }));

  return { success: true, newCount: newCount };
}
