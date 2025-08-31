
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

            // Step 1: Cleanup any existing session (timeouts, state transitions)
            if (session) {
                const now = new Date();
                const expires = new Date(session.expiresAt);

                // 1a: Handle player timeouts in waiting lobby
                if (session.status === 'waiting') {
                    const activeContestants = session.contestants.filter(c => {
                        if (!c.lastSeen) return true; // Keep if never seen (just joined)
                        const lastSeen = new Date(c.lastSeen);
                        return (now.getTime() - lastSeen.getTime()) < (PLAYER_TIMEOUT_SEC * 1000);
                    });
                    
                    if (session.contestants.length > 0 && activeContestants.length === 0) {
                        // All players timed out, delete session.
                        transaction.delete(sessionRef);
                        return null; // Exit transaction early
                    }
                    session.contestants = activeContestants;
                }
                
                // 1b: Handle session state transition if expired
                if (now > expires) {
                     if (session.status === 'waiting') {
                        if (session.contestants.length >= 2) { // Minimum 2 players to start
                            session.status = 'voting';
                            const newExpiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                            session.expiresAt = newExpiresAt.toISOString();
                        } else {
                            // Not enough players, so delete the session.
                            transaction.delete(sessionRef);
                            return null; // Exit transaction early
                        }
                    } else if (session.status === 'voting') {
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

                        if (winners.length <= 1) { 
                            session.status = 'finished';
                            session.winner = winners.length > 0 ? winners[0] : undefined;
                            if (session.winner) {
                                await awardContestPrize(session.winner.ownerId);
                            }
                        } else { 
                            session.status = 'voting';
                            session.round += 1;
                            session.contestants = winners.map(c => ({...c, votes: 0, voterIds: [] }));
                            const newExpiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                            session.expiresAt = newExpiresAt.toISOString();
                        }
                    }
                }
            }
            // End cleanup step. If session was deleted, we would have returned null already.

            // Step 2: Handle the current player's action
            const newContestant: Contestant | null = plant ? {
                ...plant,
                votes: 0,
                voterIds: [],
                ownerId: userId,
                ownerName: username,
                lastSeen: new Date().toISOString(),
            } : null;

            if (!session || session.status === 'finished') {
                // Create a new session if one doesn't exist and a plant is trying to join
                if (newContestant) {
                    session = createNewSession(newContestant);
                }
            } else if (session.status === 'waiting' && newContestant) {
                // Join an existing session if possible
                const alreadyExists = session.contestants.some(c => c.ownerId === userId);
                if (!alreadyExists && session.contestants.length < 4) {
                    session.contestants.push(newContestant);
                } else if (alreadyExists) {
                    // If player is rejoining, just update their lastSeen
                    const index = session.contestants.findIndex(c => c.ownerId === userId);
                    if (index !== -1) {
                        session.contestants[index].lastSeen = new Date().toISOString();
                    }
                }
            }
            
            // If the lobby is now full, automatically start the voting
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
        if ((error as any).code !== 'not-found' && (error as any).code !== 'aborted') {
            console.error("Failed to send heartbeat:", error);
        }
    }
}
