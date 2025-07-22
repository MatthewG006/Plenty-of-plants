
'use client';

import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { getUserGameData, type GameData } from './firestore';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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
        description: 'Collect 15 new plants.',
        target: 15,
        reward: 20,
    },
    waterPlants: {
        id: 'waterPlants',
        title: 'Green Thumb',
        description: 'Water any of your plants 20 times.',
        target: 20,
        reward: 20,
    },
    evolvePlants: {
        id: 'evolvePlants',
        title: 'Evolutionist',
        description: 'Evolve 10 of your plants.',
        target: 10,
        reward: 20,
    },
};

// Check if challenges need to be reset
export async function checkAndResetChallenges(userId: string) {
    const gameData = await getUserGameData(userId);
    if (!gameData) return;

    const now = Date.now();
    const challengesStartDate = gameData.challengesStartDate || 0;

    if (now - challengesStartDate > ONE_WEEK_MS) {
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
    if (now - (gameData.challengesStartDate || 0) > ONE_WEEK_MS) return;

    const challengeState = gameData.challenges?.[challengeId];
    if (challengeState && challengeState.claimed) {
        return; // Don't update if already claimed
    }

    await updateDoc(userDocRef, {
        [`challenges.${challengeId}.progress`]: increment(1)
    });
}

export const updateWateringProgress = (userId: string) => updateChallengeProgress(userId, 'waterPlants');
export const updateCollectionProgress = (userId: string) => updateChallengeProgress(userId, 'collectPlants');
export const updateEvolutionProgress = (userId: string) => updateChallengeProgress(userId, 'evolvePlants');

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

    