
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, getDoc, writeBatch } from 'firebase/firestore';
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

export async function finalizeContest(): Promise<ContestSession | null> {
    const sessionRef = doc(db, "contestSessions", CONTEST_SESSION_ID);
    try {
        const session = await runTransaction(db, async (transaction) => {
            const liveSessionDoc = await transaction.get(sessionRef);
            if (!liveSessionDoc.exists()) return null;

            let sessionData = liveSessionDoc.data() as ContestSession;
            const now = new Date();
            const expires = new Date(sessionData.expiresAt);

            if (now > expires) {
                 if (sessionData.status === 'waiting') {
                    transaction.delete(sessionRef);
                    return null;
                } else if (sessionData.status === 'voting') {
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

                    if (winners.length <= 1) { // Final winner
                        sessionData.status = 'finished';
                        sessionData.winner = winners[0];
                        if (sessionData.winner) {
                           await awardContestPrize(sessionData.winner.ownerId);
                        }
                    } else { // Tie, go to next round
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
            return sessionData;
        });
        return session;
    } catch (e) {
        console.error("Failed to finalize contest:", e);
        return null;
    }
}


export async function joinAndGetContestState({ userId, username, plant }: { userId: string, username: string, plant?: Plant }): Promise<{ session?: ContestSession | null, error?: string }> {
    try {
        const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);

        const finalSession = await runTransaction(db, async (transaction) => {
            const liveSessionDoc = await transaction.get(sessionRef);
            let session: ContestSession | null = liveSessionDoc.exists() ? liveSessionDoc.data() as ContestSession : null;
            
            // Handle Joining or Creating a session
            if (plant) { 
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
                
                // If adding a player makes it ready, start the voting
                if (session && session.status === 'waiting' && session.contestants.length >= 2) {
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
