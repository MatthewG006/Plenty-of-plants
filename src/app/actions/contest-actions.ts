
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  runTransaction,
} from 'firebase/firestore';
import type { Plant } from '@/interfaces/plant';
import type { ContestSession, ContestPlayer } from '@/lib/contest-manager';
import { awardContestPrize } from '@/lib/firestore';

const CONTEST_SESSION_ID = "active_contest_v3";
const CONTEST_DURATION_MS = 3 * 60 * 1000; // 3 minutes for a round
const MAX_PLAYERS = 6;

// Helper to create a new session object
function createNewSession(player: ContestPlayer): ContestSession {
    const now = new Date();
    const endsAt = new Date(now.getTime() + CONTEST_DURATION_MS);
    
    const newSession: ContestSession = {
        id: CONTEST_SESSION_ID,
        status: 'voting',
        players: { [player.uid]: player },
        votes: {},
        endsAt: endsAt.toISOString(),
        duration: CONTEST_DURATION_MS,
        createdAt: now.toISOString(),
    };
    return newSession;
}

// Helper to finalize a finished session
async function finalizeSession(transaction: any, sessionDocRef: any, sessionData: ContestSession): Promise<ContestSession> {
    const voteCounts: Record<string, number> = {};
    Object.values(sessionData.votes).forEach(votedForUid => {
        voteCounts[votedForUid] = (voteCounts[votedForUid] || 0) + 1;
    });

    let winnerId: string | null = null;
    let maxVotes = 0;
    let isTie = false;

    for (const playerId in voteCounts) {
        if (voteCounts[playerId] > maxVotes) {
            maxVotes = voteCounts[playerId];
            winnerId = playerId;
            isTie = false;
        } else if (voteCounts[playerId] === maxVotes && maxVotes > 0) {
            isTie = true;
        }
    }
    
    // If there's a tie for the highest score, there's no winner.
    if (isTie) {
      winnerId = null;
    }

    // Only award a prize if there is a single, non-tied winner.
    if (winnerId) {
        await awardContestPrize(winnerId);
    }
    
    const finalizedSession: ContestSession = {
        ...sessionData,
        winnerId: winnerId || null,
        status: 'finished'
    };
    
    transaction.set(sessionDocRef, finalizedSession);
    return finalizedSession;
}


export async function joinAndGetContestState(
  { uid, username, avatarColor, plant }: { uid: string; username: string; avatarColor: string; plant?: Plant; }
): Promise<{ session?: ContestSession; error?: string }> {
    const sessionDocRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);

    try {
        const resultSession = await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionDocRef);

            // Case 1: No session exists. Create one if joining, otherwise do nothing.
            if (!sessionDoc.exists()) {
                if (plant) {
                    const player: ContestPlayer = { uid, username, avatarColor, plant };
                    const newSession = createNewSession(player);
                    transaction.set(sessionDocRef, newSession);
                    return newSession;
                }
                return null; 
            }

            let sessionData = sessionDoc.data() as ContestSession;
            const isExpired = new Date(sessionData.endsAt).getTime() < Date.now();

            // Case 2: Session is expired and needs finalizing.
            if (isExpired && sessionData.status === 'voting') {
                const finalizedSession = await finalizeSession(transaction, sessionDocRef, sessionData);
                // If the player was trying to join, immediately start a new session for them.
                if (plant) {
                     const player: ContestPlayer = { uid, username, avatarColor, plant };
                     const newSession = createNewSession(player);
                     transaction.set(sessionDocRef, newSession);
                     return newSession;
                }
                // Otherwise, just return the finalized session results.
                return finalizedSession;
            }
            
            // Case 3: A finished session exists, and player wants to join. Start a new one.
            if (sessionData.status === 'finished' && plant) {
                 const player: ContestPlayer = { uid, username, avatarColor, plant };
                 const newSession = createNewSession(player);
                 transaction.set(sessionDocRef, newSession);
                 return newSession;
            }

            // Case 4: An active session exists.
            if (plant) { // Player is trying to join.
                if (sessionData.players[uid]) {
                    return sessionData; // Already in the contest.
                }
                if (Object.keys(sessionData.players).length >= MAX_PLAYERS) {
                    throw new Error("This contest round is full.");
                }
                // Add player to the active session.
                const player: ContestPlayer = { uid, username, avatarColor, plant };
                const updatedPlayers = { ...sessionData.players, [uid]: player };
                transaction.update(sessionDocRef, { players: updatedPlayers });
                return { ...sessionData, players: updatedPlayers };
            }

            // Case 5: Just fetching state of an active/finished session.
            return sessionData;
        });

        return { session: resultSession || undefined };

    } catch (error: any) {
        console.error("Error in joinAndGetContestState transaction: ", error);
        return { error: error.message || 'Failed to interact with contest session.' };
    }
}


export async function voteForPlant(
    { sessionId, voterUid, votedForUid }: { sessionId: string; voterUid: string; votedForUid: string; }
): Promise<{ session?: ContestSession; error?: string }> {
    if (sessionId !== CONTEST_SESSION_ID) {
        return { error: 'Invalid session ID.' };
    }
    const sessionDocRef = doc(db, 'contestSessions', sessionId);
    try {
        const updatedSession = await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionDocRef);
            if (!sessionDoc.exists()) {
                throw new Error("Contest session not found.");
            }

            const sessionData = sessionDoc.data() as ContestSession;
            
            if (sessionData.status !== 'voting') {
                throw new Error("Voting is not currently active.");
            }
            if (Date.now() > new Date(sessionData.endsAt).getTime()) {
                throw new Error("The voting period for this round has ended.");
            }
            if (sessionData.votes[voterUid]) {
                throw new Error("You have already voted.");
            }
            if (!sessionData.players[votedForUid]) {
                throw new Error("The player you voted for is not in the contest.");
            }
             if (voterUid === votedForUid) {
                throw new Error("You cannot vote for yourself.");
            }

            const newVotes = { ...sessionData.votes, [voterUid]: votedForUid };
            transaction.update(sessionDocRef, { votes: newVotes });

            return { ...sessionData, votes: newVotes };
        });
        
        return { session: updatedSession };
    } catch (error: any) {
        console.error("Error in voteForPlant transaction: ", error);
        return { error: error.message || 'Failed to cast vote.' };
    }
}
