
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, getDoc } from 'firebase/firestore';
import type { Plant, ContestSession, Contestant } from '@/lib/firestore';
import { awardContestPrize } from '@/lib/firestore';

const CONTEST_SESSION_ID = 'active'; // There is only one contest session at a time
const WAITING_TIME_SEC = 30;
const VOTE_TIME_SEC = 20;

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

            // --- I. Handle Session State & Expiration ---
            if (session && new Date(session.expiresAt) <= new Date()) {
                if (session.status === 'waiting') {
                    // Not enough players joined. The session is void.
                    transaction.delete(sessionRef);
                    session = null;
                } else if (session.status === 'voting') {
                    // Voting ended. Find winner(s).
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

                    if (winners.length <= 1) { // Final winner
                        session.status = 'finished';
                        session.winner = winners[0]; // Can be undefined if no votes
                        if (session.winner) {
                           await awardContestPrize(session.winner.ownerId);
                        }
                    } else { // Tie, go to next round
                        session.status = 'voting';
                        session.round += 1;
                        session.contestants = winners.map(c => ({...c, votes: 0, voterIds: [] }));
                        const now = new Date();
                        const expiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                        session.expiresAt = expiresAt.toISOString();
                    }
                } else if (session.status === 'finished') {
                    // Contest is over and being viewed. It can be cleared for a new one.
                    transaction.delete(sessionRef);
                    session = null;
                }
            }
            
            // --- II. Handle Joining ---
            if (plant) { // User wants to join
                const newContestant: Contestant = {
                    ...plant,
                    votes: 0,
                    voterIds: [],
                    ownerId: userId,
                    ownerName: username,
                };
                if (!session) { // No session, create one
                    session = createNewSession(newContestant);
                } else if (session.status === 'waiting') { // Add to existing session
                    const alreadyExists = session.contestants.some(c => c.ownerId === userId);
                    if (!alreadyExists) {
                        session.contestants.push(newContestant);
                    }
                }
                
                // --- III. Start Voting If Ready ---
                if (session && session.status === 'waiting' && session.contestants.length >= 2) {
                    session.status = 'voting';
                    const now = new Date();
                    const expiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                    session.expiresAt = expiresAt.toISOString();
                }
            }

            // Write changes back to Firestore
            if (session) {
                transaction.set(sessionRef, session);
            }

            return session;
        });

        return { session: finalSession };

    } catch (e: any) {
        console.error("Contest transaction failed: ", e);
        // Translate Firestore permission errors into a user-friendly message
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
