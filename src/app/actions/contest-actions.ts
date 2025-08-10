
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import type { Plant, ContestSession, Contestant } from '@/lib/firestore';
import { awardContestPrize } from '@/lib/firestore';

const CONTEST_SESSION_ID = 'active'; // There is only one contest session at a time
const WAITING_TIME_SEC = 30;
const VOTE_TIME_SEC = 20;

// Helper to create a new, empty contest session
function createNewSession(): ContestSession {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + WAITING_TIME_SEC * 1000);
    return {
        id: CONTEST_SESSION_ID,
        status: 'waiting',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        round: 1,
        contestants: [],
    };
}

export async function joinAndGetContestState({ userId, username, plant }: { userId: string, username: string, plant?: Plant }): Promise<{ session?: ContestSession | null, error?: string }> {
    try {
        const session = await runTransaction(db, async (transaction) => {
            const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
            const sessionDoc = await transaction.get(sessionRef);

            let currentSession: ContestSession | null = sessionDoc.exists() ? sessionDoc.data() as ContestSession : null;

            // --- I. FINALIZE OLD/EXPIRED SESSION ---
            if (currentSession && new Date(currentSession.expiresAt) < new Date()) {
                 if (currentSession.status === 'waiting') {
                     // Not enough players joined in time. The session is void.
                     currentSession = null; 
                 } else if (currentSession.status === 'voting') {
                    // Voting round ended. Find winners.
                    let maxVotes = -1;
                    let winners: Contestant[] = [];
                    currentSession.contestants.forEach(c => {
                        if (c.votes > maxVotes) {
                            maxVotes = c.votes;
                            winners = [c];
                        } else if (c.votes === maxVotes) {
                            winners.push(c);
                        }
                    });

                    // Reset votes for next round for all contestants
                    const nextContestants = currentSession.contestants.map(c => ({...c, votes: 0, voterIds: []}));

                    if (winners.length <= 1) { // We have a final winner or no one voted
                        const finalWinner = winners[0]; // Could be undefined if no one voted
                        currentSession.status = 'finished';
                        currentSession.winner = finalWinner; // Set the winner
                        if (finalWinner) {
                            // Don't await this, let it run in the background. It's a separate operation.
                            awardContestPrize(finalWinner.ownerId);
                        }
                    } else { // Tie, proceed to next round with the winners
                        currentSession.status = 'voting';
                        currentSession.round += 1;
                        // Filter for the contestants who are moving to the next round
                        currentSession.contestants = nextContestants.filter(c => winners.some(w => w.id === c.id));
                        const now = new Date();
                        const expiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                        currentSession.expiresAt = expiresAt.toISOString();
                    }
                 } else { // Contest is already 'finished'. It can be cleared.
                      currentSession = null;
                 }
            }

            // --- II. CREATE NEW SESSION IF ONE IS NEEDED ---
            if (!currentSession) {
                 if (plant) { // User wants to join, so we create a new session.
                    currentSession = createNewSession();
                 } else { // User is just checking, not creating. No active session.
                     return null;
                 }
            }

            // --- III. ADD PLAYER IF THEY ARE JOINING ---
            if (plant) {
                const alreadyExists = currentSession.contestants.some(c => c.ownerId === userId);
                if (currentSession.status === 'waiting' && !alreadyExists) {
                    const newContestant: Contestant = {
                        ...plant,
                        votes: 0,
                        voterIds: [],
                        ownerId: userId,
                        ownerName: username,
                    };
                    currentSession.contestants.push(newContestant);
                }
            }
            
            // --- IV. START VOTING IF READY ---
            if (currentSession.status === 'waiting' && currentSession.contestants.length >= 2) {
                currentSession.status = 'voting';
                const now = new Date();
                const expiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                currentSession.expiresAt = expiresAt.toISOString();
            }
            
            // --- V. SAVE THE FINAL STATE ---
            transaction.set(sessionRef, currentSession);
            return currentSession;
        });

        return { session };
    } catch (e) {
        console.error("Transaction failed: ", e);
        return { error: 'Failed to communicate with contest service.' };
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
