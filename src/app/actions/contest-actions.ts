
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import type { Plant } from '@/interfaces/plant';
import type { ContestSession, ContestPlayer } from '@/lib/contest-manager';
import { awardContestPrize } from '@/lib/firestore';

const CONTEST_SESSION_ID = "active_contest_v3"; // New version to avoid old data conflicts
const CONTEST_DURATION_MS = 3 * 60 * 1000; // 3 minutes for a round
const MAX_PLAYERS = 6;

// Helper to create a new session object
function createNewSession(): Omit<ContestSession, 'createdAt'> {
    const now = new Date();
    const endsAt = new Date(now.getTime() + CONTEST_DURATION_MS);
    
    const newSession: Omit<ContestSession, 'createdAt'> = {
        id: CONTEST_SESSION_ID,
        status: 'voting',
        players: {},
        votes: {},
        endsAt: endsAt.toISOString(),
        duration: CONTEST_DURATION_MS,
    };
    return newSession;
}

// Helper to finalize a finished session and prepare for a new one
async function finalizeSession(sessionData: ContestSession, batch: WriteBatch): Promise<void> {
    const voteCounts: Record<string, number> = {};
    Object.values(sessionData.votes).forEach(votedForUid => {
        voteCounts[votedForUid] = (voteCounts[votedForUid] || 0) + 1;
    });

    let winnerId: string | null = null;
    let maxVotes = -1;
    for (const playerId in voteCounts) {
        if (voteCounts[playerId] > maxVotes) {
            maxVotes = voteCounts[playerId];
            winnerId = playerId;
        }
    }

    if (winnerId) {
        await awardContestPrize(winnerId);
        const sessionDocRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
        batch.update(sessionDocRef, { winnerId: winnerId, status: 'finished' });
    } else {
        // If no votes, just mark as finished without a winner
        const sessionDocRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
        batch.update(sessionDocRef, { status: 'finished' });
    }
}


export async function joinAndGetContestState(
  { uid, username, avatarColor, plant }: { uid: string; username: string; avatarColor: string; plant?: Plant; }
): Promise<{ session?: ContestSession; error?: string }> {
    const sessionDocRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);

    try {
        const updatedSession = await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionDocRef);

            // Case 1: No session exists, or the previous one is finished. Create a new one.
            if (!sessionDoc.exists() || (sessionDoc.data() as ContestSession).status === 'finished') {
                if (plant) { // Only create a new session if a player is trying to join
                    const newSessionData = createNewSession();
                    newSessionData.players[uid] = { uid, username, avatarColor, plant };
                    transaction.set(sessionDocRef, { ...newSessionData, createdAt: serverTimestamp() });
                    return newSessionData as ContestSession;
                }
                return null; // Nothing to do if no one is joining
            }

            const sessionData = sessionDoc.data() as ContestSession;

            // Case 2: Session is expired. Finalize it and create a new one.
            if (Date.now() > new Date(sessionData.endsAt).getTime()) {
                const batch = writeBatch(db); // Use a batch for finalization
                await finalizeSession(sessionData, batch);
                await batch.commit(); // Commit finalization before proceeding

                if (plant) { // Start a new session for the joining player
                    const newSessionData = createNewSession();
                    newSessionData.players[uid] = { uid, username, avatarColor, plant };
                    transaction.set(sessionDocRef, { ...newSessionData, createdAt: serverTimestamp() });
                    return newSessionData as ContestSession;
                }
                return { ...sessionData, status: 'finished' } as ContestSession; // Show the finished state
            }
            
            // Case 3: Active session. Join if there's a plant and space.
            if (plant) {
                 if (sessionData.players[uid]) {
                    // Player is already in, just return current state
                    return sessionData;
                }
                if (Object.keys(sessionData.players).length >= MAX_PLAYERS) {
                    throw new Error("This contest round is full.");
                }
                const updatedPlayers = { ...sessionData.players, [uid]: { uid, username, avatarColor, plant } };
                transaction.update(sessionDocRef, { players: updatedPlayers });
                return { ...sessionData, players: updatedPlayers };
            }
            
            // If just fetching state without joining, return current data
            return sessionData;
        });

        if (updatedSession) {
            return { session: updatedSession };
        }
        // If transaction returns null (e.g., no session and not joining), return empty
        return {}; 

    } catch (error: any) {
        console.error("Error in joinAndGetContestState: ", error);
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
