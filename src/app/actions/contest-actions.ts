
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
            // If the waiting room expired, just delete the session.
            transaction.delete(sessionRef);
            return null;
        } else if (sessionData.status === 'voting') {
            // --- HANDLE WINNER LOGIC ---
            // If voting ended, determine the winner by finding the contestant with the most votes.
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

            if (winners.length <= 1) { // A single winner was found.
                sessionData.status = 'finished';
                sessionData.winner = winners[0];
                if (sessionData.winner) {
                    // Award the prize to the winner's user document.
                    await awardContestPrize(sessionData.winner.ownerId);
                }
            } else { // It's a tie, so start a new round with the tied players.
                sessionData.status = 'voting';
                sessionData.round += 1;
                sessionData.contestants = winners.map(c => ({...c, votes: 0, voterIds: [] }));
                const newExpiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                sessionData.expiresAt = newExpiresAt.toISOString();
            }
            // Save the updated session data back to the same document in Firestore.
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
            // Step 1: Finalize any expired contest first. This is now handled within the transaction.
            let session = await finalizeContest(transaction, sessionRef);

            // Step 2: Player Timeout Cleanup
            if (session && session.status === 'waiting') {
                const now = new Date();
                const activeContestants = session.contestants.filter(c => {
                    if (!c.lastSeen) return true; // Keep players if lastSeen is missing (for backward compatibility)
                    const lastSeen = new Date(c.lastSeen);
                    return (now.getTime() - lastSeen.getTime()) < (PLAYER_TIMEOUT_SEC * 1000);
                });

                if (activeContestants.length === 0) {
                    transaction.delete(sessionRef);
                    session = null;
                } else {
                    session.contestants = activeContestants;
                }
            }
            // End Cleanup

            // Step 3: Handle the player's action (joining or creating)
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
                    session = createNewSession(newContestant);
                } else if (session.status === 'waiting') {
                    const alreadyExists = session.contestants.some(c => c.ownerId === userId);
                    if (!alreadyExists && session.contestants.length < 4) {
                        session.contestants.push(newContestant);
                    }
                }
                
                if (session && session.status === 'waiting' && session.contestants.length >= 3) {
                    session.status = 'voting';
                    const now = new Date();
                    const expiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                    session.expiresAt = expiresAt.toISOString();
                }
            }

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
        const sessionDoc = await getDoc(sessionRef);
        if (!sessionDoc.exists()) return;

        const sessionData = sessionDoc.data() as ContestSession;
        if (sessionData.status !== 'waiting') return;

        const contestantIndex = sessionData.contestants.findIndex(c => c.ownerId === userId);
        if (contestantIndex !== -1) {
            const updatePath = `contestants.${contestantIndex}.lastSeen`;
            await updateDoc(sessionRef, {
                [updatePath]: new Date().toISOString()
            });
        }
    } catch (error) {
        // It's possible the session ends while a heartbeat is in flight.
        // We can safely ignore "document not found" errors here.
        if ((error as any).code !== 'not-found') {
            console.error("Failed to send heartbeat:", error);
        }
    }
}

    