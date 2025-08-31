
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, getDoc, writeBatch, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Plant, ContestSession, Contestant } from '@/interfaces/plant';
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


export async function joinAndGetContestState({ userId, username, plant }: { userId: string, username: string, plant?: Plant }): Promise<{ session?: ContestSession | null, error?: string }> {
    try {
        const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);

        const finalSession = await runTransaction(db, async (transaction) => {
            const liveSessionDoc = await transaction.get(sessionRef);
            let session: ContestSession | null = liveSessionDoc.exists() ? liveSessionDoc.data() as ContestSession : null;

            // Step 1: Session state machine. Process current state before anything else.
            if (session) {
                const now = new Date();
                const expires = new Date(session.expiresAt);

                // 1a: Handle player timeouts in waiting lobby. This is a soft cleanup.
                if (session.status === 'waiting') {
                    const activeContestants = session.contestants.filter(c => {
                        if (!c.lastSeen) return true; // Keep if never seen (just joined)
                        const lastSeen = new Date(c.lastSeen);
                        return (now.getTime() - lastSeen.getTime()) < (PLAYER_TIMEOUT_SEC * 1000);
                    });
                    
                    // If all players timed out, the lobby is dead. It will be cleaned up by the expiration logic below.
                    if (session.contestants.length > 0 && activeContestants.length === 0) {
                         transaction.delete(sessionRef);
                         return null; // The session is gone, exit immediately.
                    }
                    session.contestants = activeContestants;
                }
                
                // 1b: Handle session state transition if expired
                if (now > expires) {
                     if (session.status === 'waiting') {
                        // A waiting lobby has expired. It needs at least 2 players to start.
                        if (session.contestants.length >= 2) { 
                            session.status = 'voting';
                            const newExpiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                            session.expiresAt = newExpiresAt.toISOString();
                        } else {
                            // Not enough players, the contest is a dud. Delete it.
                            transaction.delete(sessionRef);
                            return null; 
                        }
                    } else if (session.status === 'voting') {
                        // Voting has ended. Determine winner or handle tie.
                        let maxVotes = -1;
                        let winners: Contestant[] = [];
                        session.contestants.forEach(c => {
                            if (c.votes > maxVotes) {
                                maxVotes = c.votes;
                                winners = [c];
                            } else if (c.votes === maxVotes) {
                                winners.push(c);
                            }
                        });

                        if (winners.length === 1) { // We have a clear winner
                            session.status = 'finished';
                            session.winner = winners[0];
                            if (session.winner) {
                                await awardContestPrize(session.winner.ownerId);
                            }
                        } else { // Tie or no votes, start a new round with the tied players
                            session.status = 'voting';
                            session.round += 1;
                            // If everyone had 0 votes, all original contestants move on.
                            const nextRoundContestants = winners.length > 0 ? winners : session.contestants;
                            session.contestants = nextRoundContestants.map(c => ({...c, votes: 0, voterIds: [] }));
                            const newExpiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                            session.expiresAt = newExpiresAt.toISOString();
                        }
                    }
                }
            }
            // End of State Machine. `session` is now the single source of truth.
            if (session === null && !plant) {
                return null;
            }

            // Step 2: Handle the current player's action, if they are trying to join.
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
                    // Create a brand new session.
                    session = createNewSession(newContestant);
                } else if (session.status === 'waiting') {
                    // Try to join the existing waiting lobby.
                    const alreadyExists = session.contestants.some(c => c.ownerId === userId);
                    if (!alreadyExists && session.contestants.length < 4) {
                        session.contestants.push(newContestant);
                    }
                }
            }
            
            // If the lobby just became full, automatically start the voting.
            if (session && session.status === 'waiting' && session.contestants.length === 4) {
                session.status = 'voting';
                const now = new Date();
                const expiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                session.expiresAt = expiresAt.toISOString();
            }

            // Step 3: Write final session state to Firestore
            if (session) {
                transaction.set(sessionRef, session);
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
        // It's okay if this fails occasionally (e.g. transaction contention).
        // It's just a heartbeat. We can ignore most errors.
        if ((error as any).code !== 'not-found' && (error as any).code !== 'aborted') {
            console.warn("Failed to send heartbeat:", error);
        }
    }
}

/**
 * A dedicated, simple function to clean up a stale lobby.
 * This is called by the client before attempting to join a new contest.
 */
export async function cleanupExpiredContest(): Promise<void> {
    try {
        const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
        await runTransaction(db, async (transaction) => {
            const liveSessionDoc = await transaction.get(sessionRef);
            if (!liveSessionDoc.exists()) {
                return; // No session to clean up
            }

            const session = liveSessionDoc.data() as ContestSession;
            const now = new Date();
            const expires = new Date(session.expiresAt);
            
            // Only clean up expired 'waiting' lobbies with too few players
            if (session.status === 'waiting' && now > expires && session.contestants.length < 2) {
                transaction.delete(sessionRef);
            }
        });
    } catch (e: any) {
        // This is a cleanup function, so we don't want to throw errors to the client
        // if it fails. We can just log it.
        console.warn("Contest cleanup transaction failed:", e.message);
    }
}
