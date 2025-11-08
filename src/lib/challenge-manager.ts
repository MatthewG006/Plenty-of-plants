
'use client';

import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
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

export const secondaryChallenges: Record<string, Omit<Challenge, 'progress' | 'claimed'>> = {
    waterEvolved: {
        id: 'waterEvolved',
        title: 'Advanced Care',
        description: 'Water 5 evolved plants.',
        target: 5,
        reward: 15,
    },
    collectMorePlants: {
        id: 'collectMorePlants',
        title: 'Master Collector',
        description: 'Add 2 more plants to your collection.',
        target: 2,
        reward: 15,
    },
    likePlayer: {
        id: 'likePlayer',
        title: 'Community Spirit',
        description: 'Like another player\'s collection.',
        target: 1,
        reward: 20,
    },
    applySheen: {
        id: 'applySheen',
        title: 'Shine On',
        description: 'Apply a sheen pack to a plant.',
        target: 1,
        reward: 25,
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
export async function updateChallengeProgress(userId: string, challengeId: string, value: number = 1) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);
    if (!gameData) return;

    // Don't update if challenges are expired (they will be reset on next load)
    const now = Date.now();
    if (now - (gameData.challengesStartDate || 0) > ONE_DAY_MS) return;

    const allChallenges = {...challenges, ...secondaryChallenges};
    const challengeDef = allChallenges[challengeId];
    if (!challengeDef) return;

    const challengeState = gameData.challenges?.[challengeId];
    if (challengeState && (challengeState.claimed || challengeState.progress >= challengeDef.target)) {
        return; // Don't update if already claimed or complete
    }

    await updateDoc(userDocRef, {
        [`challenges.${challengeId}.progress`]: increment(value)
    });
}

export const updateWateringProgress = (userId: string) => updateChallengeProgress(userId, 'waterPlants');
export const updateCollectionProgress = (userId: string) => {
    updateChallengeProgress(userId, 'collectPlants');
    updateChallengeProgress(userId, 'collectMorePlants');
}
export const updateEvolutionProgress = (userId: string) => updateChallengeProgress(userId, 'evolvePlant');
export const updateWaterEvolvedProgress = (userId: string) => updateChallengeProgress(userId, 'waterEvolved');
export const updateLikePlayerProgress = (userId: string) => updateChallengeProgress(userId, 'likePlayer');
export const updateApplyGlitterProgress = (userId: string) => updateChallengeProgress(userId, 'applyGlitter');
export const updateApplySheenProgress = (userId: string) => updateChallengeProgress(userId, 'applySheen');


export const updateLoginProgress = async (userId: string) => {
    const gameData = await getUserGameData(userId);
    if (!gameData) return;
    
    // Only set progress to 1 if it's not already set for the day.
    const challengeState = gameData.challenges?.['dailyLogin'];
    if (!challengeState || challengeState.progress < 1) {
        const userDocRef = doc(db, 'users', userId);
         await updateDoc(userDocRef, {
            [`challenges.dailyLogin.progress`]: 1
        });
    }
}

// Claim reward
export async function claimChallengeReward(userId: string, challengeId: string) {
    const userDocRef = doc(db, 'users', userId);
    const gameData = await getUserGameData(userId);
    if (!gameData) throw new Error("User data not found.");

    const allChallenges = {...challenges, ...secondaryChallenges};
    const challengeDef = allChallenges[challengeId];
    const challengeState = gameData.challenges?.[challengeId];

    if (!challengeDef || !challengeState) throw new Error("Challenge not found.");
    if (challengeState.claimed) throw new Error("Reward already claimed.");
    if (challengeState.progress < challengeDef.target) throw new Error("Challenge not yet complete.");

    await updateDoc(userDocRef, {
        gold: increment(challengeDef.reward),
        [`challenges.${challengeId}.claimed`]: true
    });
}
