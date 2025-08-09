
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
  setDoc,
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

async function createNewSession(player: ContestPlayer | null): Promise<ContestSession> {
    const now = Date.now();
    const newSession: ContestSession = {
        id: CONTEST_SESSION_ID,
        status: 'voting',
        players: {},
        votes: {},
        endsAt: new Date(now + CONTEST_DURATION_MS).toISOString(),
        duration: CONTEST_DURATION_MS,
        createdAt: serverTimestamp(),
    };
    if (player) {
        newSession.players[player.uid] = player;
    }
    return newSession;
}

export async function joinAndGetContestState(
  { uid, username, avatarColor, plant }: JoinRequest
): Promise<{ session?: ContestSession; error?: string }> {
    try {
        const sessionDocRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
        const player: ContestPlayer | null = plant ? { uid, username, avatarColor, plant } : null;

        // First, try to get the document
        const sessionDoc = await getDoc(sessionDocRef);

        if (!sessionDoc.exists() || Date.now() > new Date((sessionDoc.data() as ContestSession).endsAt).getTime()) {
             // If the session doesn't exist or is expired, we need to create a new one.
             // If the old one is just expired, we should award prizes first.
            if(sessionDoc.exists()) {
                const oldSessionData = sessionDoc.data() as ContestSession;
                if (oldSessionData.status === 'voting') {
                    const voteCounts: Record<string, number> = {};
                    Object.values(oldSessionData.votes).forEach(votedForUid => {
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
                    }
                }
            }

            const newSession = await createNewSession(player);
            await setDoc(sessionDocRef, newSession);
            // We need to convert serverTimestamp to a client-readable format before returning
            const finalSession = (await getDoc(sessionDocRef)).data() as ContestSession;
            return { session: finalSession };
        }
        
        // If the session exists and is active, try to join via transaction
        if (player) {
            const updatedSession = await runTransaction(db, async (transaction) => {
                const freshSessionDoc = await transaction.get(sessionDocRef);
                if (!freshSessionDoc.exists()) {
                    throw new Error("Session disappeared unexpectedly.");
                }
                const sessionData = freshSessionDoc.data() as ContestSession;
                
                // Add the new player
                sessionData.players[uid] = player;
                
                transaction.update(sessionDocRef, { players: sessionData.players });
                return sessionData;
            });
             return { session: updatedSession };
        } else {
            // If just fetching state without joining, return the current data
            return { session: sessionDoc.data() as ContestSession };
        }

    } catch (error: any) {
        console.error("Error in joinAndGetContestState: ", error);
        return { error: 'Failed to interact with contest session.' };
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

            sessionData.votes[voterUid] = votedForUid;
            transaction.update(sessionDocRef, { votes: sessionData.votes });

            return sessionData;
        });
        
        return { session: updatedSession };
    } catch (error: any) {
        console.error("Error in voteForPlant transaction: ", error);
        return { error: error.message || 'Failed to cast vote.' };
    }
}
