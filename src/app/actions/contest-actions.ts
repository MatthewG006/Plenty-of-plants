
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import type { Plant } from '@/interfaces/plant';
import type { ContestSession } from '@/lib/contest-manager';
import { awardContestPrize } from '@/lib/firestore';

const CONTEST_SESSION_ID = "active_contest_v3";
const CONTEST_DURATION_MS = 3 * 60 * 1000; // 3 minutes for a round
const MAX_PLAYERS = 6;

// Helper to create a new session object
function createNewSession(player: { uid: string; username: string; avatarColor: string; plant: Plant; }): Omit<ContestSession, 'createdAt'> {
    const now = new Date();
    const endsAt = new Date(now.getTime() + CONTEST_DURATION_MS);
    
    const newSession: Omit<ContestSession, 'createdAt'> = {
        id: CONTEST_SESSION_ID,
        status: 'voting',
        players: { [player.uid]: player },
        votes: {},
        endsAt: endsAt.toISOString(),
        duration: CONTEST_DURATION_MS,
    };
    return newSession;
}

// Helper to finalize a finished session
async function finalizeSession(sessionData: ContestSession): Promise<ContestSession> {
    const voteCounts: Record<string, number> = {};
    Object.values(sessionData.votes).forEach(votedForUid => {
        voteCounts[votedForUid] = (voteCounts[votedForUid] || 0) + 1;
    });

    let winnerId: string | null = null;
    let maxVotes = 0;
    for (const playerId in voteCounts) {
        if (voteCounts[playerId] > maxVotes) {
            maxVotes = voteCounts[playerId];
            winnerId = playerId;
        } else if (voteCounts[playerId] === maxVotes) {
            winnerId = null; // Tie results in no winner
        }
    }

    if (winnerId) {
        await awardContestPrize(winnerId);
    }
    
    const sessionDocRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
    const finalizedSession: ContestSession = {
        ...sessionData,
        winnerId: winnerId || null,
        status: 'finished'
    };
    await setDoc(sessionDocRef, finalizedSession);
    return finalizedSession;
}


export async function joinAndGetContestState(
  { uid, username, avatarColor, plant }: { uid: string; username: string; avatarColor: string; plant?: Plant; }
): Promise<{ session?: ContestSession; error?: string }> {
    const sessionDocRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);

    try {
        const sessionDoc = await getDoc(sessionDocRef);

        // Case 1: No session exists. Create a new one if attempting to join.
        if (!sessionDoc.exists()) {
            if (plant) {
                const newSessionData = createNewSession({ uid, username, avatarColor, plant });
                await setDoc(sessionDocRef, { ...newSessionData, createdAt: serverTimestamp() });
                return { session: newSessionData as ContestSession };
            }
            return {}; // No session, not trying to join.
        }

        let sessionData = sessionDoc.data() as ContestSession;

        // Case 2: Session has expired. Finalize it.
        if (Date.now() > new Date(sessionData.endsAt).getTime() && sessionData.status === 'voting') {
            sessionData = await finalizeSession(sessionData);

            // If the player was trying to join, start a new session for them immediately after finalizing the old one.
            if (plant) {
                 const newSessionData = createNewSession({ uid, username, avatarColor, plant });
                await setDoc(sessionDocRef, { ...newSessionData, createdAt: serverTimestamp() });
                return { session: newSessionData as ContestSession };
            }
        }
        
        // Case 3: Player is just fetching state, return current session data.
        if (!plant) {
            return { session: sessionData };
        }

        // Case 4: Player is trying to join an active session.
        if (sessionData.players[uid]) {
            return { session: sessionData }; // Already in.
        }
        if (Object.keys(sessionData.players).length >= MAX_PLAYERS) {
            return { error: "This contest round is full." };
        }
        
        // Use a transaction to safely add the player.
        const updatedSession = await runTransaction(db, async (transaction) => {
            const freshSessionDoc = await transaction.get(sessionDocRef);
            if (!freshSessionDoc.exists()) {
                throw new Error("Contest session disappeared.");
            }
            const freshSessionData = freshSessionDoc.data() as ContestSession;
            const updatedPlayers = { ...freshSessionData.players, [uid]: { uid, username, avatarColor, plant } };
            transaction.update(sessionDocRef, { players: updatedPlayers });
            return { ...freshSessionData, players: updatedPlayers };
        });

        return { session: updatedSession };

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
