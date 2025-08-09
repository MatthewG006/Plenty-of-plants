
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  runTransaction,
  serverTimestamp,
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

async function createNewSession(): Promise<ContestSession> {
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
    return newSession;
}

export async function joinAndGetContestState(
  { uid, username, avatarColor, plant }: JoinRequest
): Promise<{ session?: ContestSession; error?: string }> {
    try {
        const sessionDocRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);

        const updatedSession = await runTransaction(db, async (transaction) => {
            let sessionData: ContestSession | null = null;
            const sessionDoc = await transaction.get(sessionDocRef);

            if (!sessionDoc.exists()) {
                // No session exists, create a new one.
                sessionData = await createNewSession();
            } else {
                sessionData = sessionDoc.data() as ContestSession;
                const endsAt = new Date(sessionData.endsAt).getTime();

                // If the session has ended, create a new one.
                if (Date.now() > endsAt) {
                    if (sessionData.status === 'voting') {
                         // Tally votes and award prize for the ended session before creating a new one.
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
                        }
                    }
                    sessionData = await createNewSession();
                }
            }

            // If the user wants to join with a plant, add them to the session.
            if (plant) {
                const newPlayer: ContestPlayer = { uid, username, avatarColor, plant };
                sessionData.players[uid] = newPlayer;
            }

            transaction.set(sessionDocRef, sessionData, { merge: true });
            return sessionData;
        });

        return { session: updatedSession };
    } catch (error: any) {
        console.error("Error in joinAndGetContestState transaction: ", error);
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
