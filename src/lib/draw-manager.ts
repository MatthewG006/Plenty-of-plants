
'use client';

const DRAWS_STORAGE_KEY = 'plenty-of-plants-draws';
export const MAX_DRAWS = 2;
const REFILL_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

interface DrawData {
  count: number;
  lastUpdated: number;
}

export function getStoredDraws(): DrawData {
  try {
    const storedDrawsRaw = localStorage.getItem(DRAWS_STORAGE_KEY);
    if (storedDrawsRaw) {
      const storedDraws = JSON.parse(storedDrawsRaw);
      // Basic validation
      if (typeof storedDraws.count === 'number' && typeof storedDraws.lastUpdated === 'number') {
        return storedDraws;
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
    
    saveDraws({ count: newCount, lastUpdated: newLastUpdated });
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
        saveDraws({ count: newCount, lastUpdated: newLastUpdated });
        // Manually dispatch a storage event to notify other open tabs
        window.dispatchEvent(new StorageEvent('storage', {
            key: DRAWS_STORAGE_KEY,
            newValue: JSON.stringify({ count: newCount, lastUpdated: newLastUpdated }),
        }));
    }
}

export function claimFreeDraw(): { success: boolean, newCount: number } {
  const draws = getStoredDraws();

  if (draws.count >= MAX_DRAWS) {
    return { success: false, newCount: draws.count };
  }
  
  const newCount = Math.min(draws.count + 1, MAX_DRAWS);
  const newLastUpdated = (newCount === MAX_DRAWS) ? Date.now() : draws.lastUpdated;

  const newDrawsData = { count: newCount, lastUpdated: newLastUpdated };
  saveDraws(newDrawsData);

  // Manually dispatch a storage event to notify other tabs
  window.dispatchEvent(new StorageEvent('storage', {
    key: DRAWS_STORAGE_KEY,
    newValue: JSON.stringify(newDrawsData),
  }));

  return { success: true, newCount: newCount };
}
