
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, getDoc, writeBatch, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Plant, ContestSession, Contestant } from '@/lib/firestore';
import { awardContestPrize } from '@/lib/firestore';

const CONTEST_SESSION_ID = 'active'; // There is only one contest session at a time
const WAITING_TIME_SEC = 30;
const VOTE_TIME_SEC = 20;
const PLAYER_TIMEOUT_SEC = 15; // A player is considered disconnected after this many seconds of inactivity

// Helper to create a new, empty contest session
function createNewSession(plant: Contestant): ContestSession {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + WAITING_TIME_SEC * 1000);
    return {
        id: CONTEST_SESSION_ID,
        status: 'waiting',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        round: 1,
        contestants: [plant],
    };
}

async function finalizeContest(transaction: FirebaseFirestore.Transaction, sessionRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>): Promise<ContestSession | null> {
    const liveSessionDoc = await transaction.get(sessionRef);
    if (!liveSessionDoc.exists()) return null;

    let sessionData = liveSessionDoc.data() as ContestSession;
    const now = new Date();
    const expires = new Date(sessionData.expiresAt);

    if (now > expires) {
            if (sessionData.status === 'waiting') {
            // If waiting room expired and not enough players, start voting anyway.
            if (sessionData.contestants.length >= 2) {
                sessionData.status = 'voting';
                const newExpiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                sessionData.expiresAt = newExpiresAt.toISOString();
                transaction.set(sessionRef, sessionData);
                return sessionData;
            } else {
                // If not enough players, just delete the session.
                transaction.delete(sessionRef);
                return null;
            }
        } else if (sessionData.status === 'voting') {
            // --- HANDLE WINNER LOGIC ---
            let maxVotes = -1;
            let winners: Contestant[] = [];
            sessionData.contestants.forEach(c => {
                if (c.votes > maxVotes) {
                    maxVotes = c.votes;
                    winners = [c];
                } else if (c.votes === maxVotes) {
                    winners.push(c);
                }
            });

            if (winners.length <= 1) { // A single winner was found (or no one voted).
                sessionData.status = 'finished';
                sessionData.winner = winners[0]; // Could be undefined if no one voted, which is fine.
                if (sessionData.winner) {
                    await awardContestPrize(sessionData.winner.ownerId);
                }
            } else { // It's a tie, so start a new round with the tied players.
                sessionData.status = 'voting';
                sessionData.round += 1;
                sessionData.contestants = winners.map(c => ({...c, votes: 0, voterIds: [] }));
                const newExpiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                sessionData.expiresAt = newExpiresAt.toISOString();
            }
            transaction.set(sessionRef, sessionData);
            return sessionData;
        }
    }
    // If the session hasn't expired, just return the current data.
    return sessionData;
}


export async function joinAndGetContestState({ userId, username, plant }: { userId: string, username: string, plant?: Plant }): Promise<{ session?: ContestSession | null, error?: string }> {
    try {
        const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);

        const finalSession = await runTransaction(db, async (transaction) => {
            const liveSessionDoc = await transaction.get(sessionRef);
            let session: ContestSession | null = liveSessionDoc.exists() ? liveSessionDoc.data() as ContestSession : null;

            // Step 1: Player Timeout Cleanup
            if (session && session.status === 'waiting') {
                const now = new Date();
                const activeContestants = session.contestants.filter(c => {
                    if (!c.lastSeen) return true;
                    const lastSeen = new Date(c.lastSeen);
                    return (now.getTime() - lastSeen.getTime()) < (PLAYER_TIMEOUT_SEC * 1000);
                });

                if (session.contestants.length > 0 && activeContestants.length === 0) {
                    transaction.delete(sessionRef);
                    session = null;
                } else if (session) {
                    session.contestants = activeContestants;
                }
            }
            // End Cleanup

            // Step 2: Handle the player's action (joining or creating)
            if (plant) { 
                const newContestant: Contestant = {
                    ...plant,
                    votes: 0,
                    voterIds: [],
                    ownerId: userId,
                    ownerName: username,
                    lastSeen: new Date().toISOString(),
                };

                if (!session || session.status === 'finished') {
                    // Create a new session if one doesn't exist or is finished
                    session = createNewSession(newContestant);
                } else if (session.status === 'waiting') {
                    // Join an existing session if possible
                    const alreadyExists = session.contestants.some(c => c.ownerId === userId);
                    if (!alreadyExists && session.contestants.length < 4) {
                        session.contestants.push(newContestant);
                    }
                }
                
                // If the lobby is now full, automatically start the voting
                if (session && session.status === 'waiting' && session.contestants.length >= 3) {
                    session.status = 'voting';
                    const now = new Date();
                    const expiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                    session.expiresAt = expiresAt.toISOString();
                }
            }

            // Step 3: Write changes to Firestore
            if (session) {
                // Use transaction.set() which works for both creating and overwriting.
                transaction.set(sessionRef, session);
            } else if (liveSessionDoc.exists()) {
                // If we determined the session should be deleted (e.g. timeout with no players)
                transaction.delete(sessionRef);
            }

            return session;
        });

        return { session: finalSession };

    } catch (e: any) {
        console.error("Contest transaction failed: ", e);
        if (e.code === 'permission-denied') {
             return { error: 'Missing or insufficient permissions. Please check your Firestore security rules as per the documentation.' };
        }
        return { error: e.message || 'Failed to communicate with contest service.' };
    }
}


export async function voteForContestant(userId: string, plantId: number): Promise<{ success: boolean; error?: string }> {
    try {
        await runTransaction(db, async (transaction) => {
            const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
            const sessionDoc = await transaction.get(sessionRef);

            if (!sessionDoc.exists()) {
                throw new Error("No active contest to vote in.");
            }

            const session = sessionDoc.data() as ContestSession;

            if (session.status !== 'voting') {
                throw new Error("Voting is not active.");
            }
            if (session.contestants.some(c => c.voterIds?.includes(userId))) {
                throw new Error("You have already voted in this round.");
            }

            const contestantIndex = session.contestants.findIndex(c => c.id === plantId);
            if (contestantIndex === -1) {
                throw new Error("This plant is not in the current contest round.");
            }

            const contestant = session.contestants[contestantIndex];
            if (contestant.ownerId === userId) {
                throw new Error("You cannot vote for your own plant.");
            }

            session.contestants[contestantIndex].votes += 1;
            if (!session.contestants[contestantIndex].voterIds) {
                session.contestants[contestantIndex].voterIds = [];
            }
            session.contestants[contestantIndex].voterIds.push(userId);
            
            transaction.set(sessionRef, session);
        });

        return { success: true };
    } catch (e: any) {
        console.error("Vote transaction failed: ", e);
        return { success: false, error: e.message || 'Failed to cast vote.' };
    }
}


export async function sendHeartbeat(userId: string) {
    const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);

    try {
        await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists()) return;

            const sessionData = sessionDoc.data() as ContestSession;
            if (sessionData.status !== 'waiting') return;

            const contestantIndex = sessionData.contestants.findIndex(c => c.ownerId === userId);
            if (contestantIndex !== -1) {
                sessionData.contestants[contestantIndex].lastSeen = new Date().toISOString();
                transaction.set(sessionRef, sessionData);
            }
        });
    } catch (error) {
        if ((error as any).code !== 'not-found' && (error as any).code !== 'aborted') {
            console.error("Failed to send heartbeat:", error);
        }
    }
}
