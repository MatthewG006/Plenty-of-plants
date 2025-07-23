
'use client';

import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { getUserGameData, type GameData } from './firestore';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface Challenge {
    id: string;
    title: string;
    description: string;
    target: number;
    reward: number;
    progress: number;
    claimed: boolean;
}

export const challenges: Record<string, Omit<Challenge, 'progress' | 'claimed'>> = {
    collectPlants: {
        id: 'collectPlants',
        title: 'Plant Collector',
        description: 'Collect 3 new plants.',
        target: 3,
        reward: 5,
    },
    waterPlants: {
        id: 'waterPlants',
        title: 'Green Thumb',
        description: 'Water your plants 5 times.',
        target: 5,
        reward: 5,
    },
    evolvePlant: {
        id: 'evolvePlant',
        title: 'Evolutionist',
        description: 'Evolve 1 of your plants.',
        target: 1,
        reward: 10,
    },
};

// Check if challenges need to be reset
export async function checkAndResetChallenges(userId: string) {
    const gameData = await getUserGameData(userId);
    if (!gameData) return;

    const now = Date.now();
    const challengesStartDate = gameData.challengesStartDate || 0;

    if (now - challengesStartDate > ONE_DAY_MS) {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            challenges: {}, // Reset all challenge progress
            challengesStartDate: now
        });
    }
}

// Update challenge progress
export async function updateChallengeProgress(userId: string, challengeId: keyof typeof challenges) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);
    if (!gameData) return;

    // Don't update if challenges are expired (they will be reset on next load)
    const now = Date.now();
    if (now - (gameData.challengesStartDate || 0) > ONE_DAY_MS) return;

    const challengeState = gameData.challenges?.[challengeId];
    if (challengeState && (challengeState.claimed || challengeState.progress >= challenges[challengeId].target)) {
        return; // Don't update if already claimed or complete
    }

    await updateDoc(userDocRef, {
        [`challenges.${challengeId}.progress`]: increment(1)
    });
}

export const updateWateringProgress = (userId: string) => updateChallengeProgress(userId, 'waterPlants');
export const updateCollectionProgress = (userId: string) => updateChallengeProgress(userId, 'collectPlants');
export const updateEvolutionProgress = (userId: string) => updateChallengeProgress(userId, 'evolvePlant');

// Claim reward
export async function claimChallengeReward(userId: string, challengeId: string) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);
    if (!gameData) throw new Error("User data not found.");

    const challengeDef = challenges[challengeId];
    const challengeState = gameData.challenges?.[challengeId];

    if (!challengeDef || !challengeState) throw new Error("Challenge not found.");
    if (challengeState.claimed) throw new Error("Reward already claimed.");
    if (challengeState.progress < challengeDef.target) throw new Error("Challenge not yet complete.");

    await updateDoc(userDocRef, {
        gold: increment(challengeDef.reward),
        [`challenges.${challengeId}.claimed`]: true
    });
}
