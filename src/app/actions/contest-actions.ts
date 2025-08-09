
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
  setDoc,
  WriteBatch,
  writeBatch,
} from 'firebase/firestore';
import type { Plant } from '@/interfaces/plant';
import type { ContestSession, ContestPlayer } from '@/lib/contest-manager';
import { awardContestPrize } from '@/lib/firestore';

const CONTEST_SESSION_ID = "active_contest_v2";
const CONTEST_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface JoinRequest {
    uid: string;
    username: string;
    avatarColor: string;
    plant?: Plant;
}

// Helper function to create a new session object
function createNewSession(player: ContestPlayer | null): Omit<ContestSession, 'createdAt'> {
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
    if (player) {
        newSession.players[player.uid] = player;
    }
    return newSession;
}

// Helper to finalize a finished session
async function finalizeSession(sessionData: ContestSession, batch: WriteBatch): Promise<void> {
    if (sessionData.status !== 'voting') return;

    const voteCounts: Record<string, number> = {};
    Object.values(sessionData.votes).forEach(votedForUid => {
        voteCounts[votedForUid] = (voteCounts[votedForUid] || 0) + 1;
    });

    let winnerId: string | null = null;
    let maxVotes = 0; // Start at 0, not -1
    for (const playerId in voteCounts) {
        if (voteCounts[playerId] > maxVotes) {
            maxVotes = voteCounts[playerId];
            winnerId = playerId;
        }
    }
    
    // In case of a tie, the first player to reach max votes wins (based on iteration order)
    // A more complex tie-breaking rule could be implemented if needed.

    if (winnerId) {
        await awardContestPrize(winnerId);
        const sessionDocRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
        batch.update(sessionDocRef, { winnerId: winnerId, status: 'finished' });
    }
}


export async function joinAndGetContestState(
  { uid, username, avatarColor, plant }: JoinRequest
): Promise<{ session?: ContestSession; error?: string }> {
    try {
        const sessionDocRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
        const player: ContestPlayer | null = plant ? { uid, username, avatarColor, plant } : null;

        // --- Step 1: Get current session state ---
        const sessionDoc = await getDoc(sessionDocRef);

        // --- Step 2: Handle expired or non-existent session ---
        if (!sessionDoc.exists() || Date.now() > new Date(sessionDoc.data().endsAt).getTime()) {
            const batch = writeBatch(db);

            // If a session exists and is expired, finalize it first.
            if (sessionDoc.exists()) {
                await finalizeSession(sessionDoc.data() as ContestSession, batch);
            }
            
            // Create a new session for the current player
            const newSessionData = createNewSession(player);
            // Use set with merge:true to ensure we create or overwrite cleanly
            batch.set(sessionDocRef, { ...newSessionData, createdAt: serverTimestamp() }, { merge: true });

            await batch.commit();

            // Return the newly created session data
            const finalSessionDoc = await getDoc(sessionDocRef);
            return { session: finalSessionDoc.data() as ContestSession };
        }
        
        // --- Step 3: Handle active session ---
        const sessionData = sessionDoc.data() as ContestSession;
        
        // If the user just wants to get the state without joining with a plant, return current state.
        if (!player) {
            return { session: sessionData };
        }
        
        // If the player is already in, return current state.
        if (sessionData.players[uid]) {
            return { session: sessionData };
        }
        
        // --- Step 4: Join the active session via Transaction ---
        const updatedSession = await runTransaction(db, async (transaction) => {
            const freshSessionDoc = await transaction.get(sessionDocRef);
            if (!freshSessionDoc.exists()) {
                throw new Error("Session disappeared unexpectedly.");
            }
            const currentSessionData = freshSessionDoc.data() as ContestSession;
            
            // Double-check expiration inside transaction to avoid race conditions
            if (Date.now() > new Date(currentSessionData.endsAt).getTime()) {
                // If it expired between our initial check and now, we abort the transaction.
                // The next call to this function will trigger the expiration logic from Step 2.
                return null;
            }

            // Add the new player
            const updatedPlayers = { ...currentSessionData.players, [uid]: player };
            transaction.update(sessionDocRef, { players: updatedPlayers });
            
            return { ...currentSessionData, players: updatedPlayers };
        });

        if (updatedSession === null) {
            // This means the session expired mid-transaction. We can recall the function to reset.
            return joinAndGetContestState({ uid, username, avatarColor, plant });
        }

        return { session: updatedSession };

    } catch (error: any) {
        console.error("Error in joinAndGetContestState: ", error);
        return { error: error.message || 'Failed to interact with contest session.' };
    }
}


interface VoteRequest {
    sessionId: string;
    voterUid: string;
    votedForUid: string;
}

export async function voteForPlant(
    { sessionId, voterUid, votedForUid }: VoteRequest
): Promise<{ session?: ContestSession; error?: string }> {
    if (sessionId !== CONTEST_SESSION_ID) {
        return { error: 'Invalid session ID.' };
    }
    try {
        const sessionDocRef = doc(db, 'contestSessions', sessionId);
        const updatedSession = await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionDocRef);
            if (!sessionDoc.exists()) {
                throw new Error("Contest session not found.");
            }

            const sessionData = sessionDoc.data() as ContestSession;
            
            if (sessionData.status !== 'voting') {
                throw new Error("Voting is not currently active.");
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
