
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, getDoc } from 'firebase/firestore';
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

async function finalizeExpiredSession(session: ContestSession | null): Promise<ContestSession | null> {
    if (!session || new Date(session.expiresAt) > new Date()) {
        return session; // Session is not expired or doesn't exist
    }

    if (session.status === 'waiting') {
        // Not enough players joined in time. The session is void.
        const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
        await runTransaction(db, async (transaction) => {
            transaction.delete(sessionRef);
        });
        return null;
    }
    
    if (session.status === 'voting') {
        // Voting round ended. Find winners.
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

        // Reset votes for the next round for all contestants
        const nextContestants = session.contestants.map(c => ({...c, votes: 0, voterIds: []}));

        if (winners.length <= 1) { // We have a final winner or no one voted
            const finalWinner = winners[0];
            session.status = 'finished';
            session.winner = finalWinner;
            if (finalWinner) {
                // Awarding the prize is a separate operation now.
                await awardContestPrize(finalWinner.ownerId);
            }
        } else { // Tie, proceed to the next round with the winners
            session.status = 'voting';
            session.round += 1;
            session.contestants = nextContestants.filter(c => winners.some(w => w.id === c.id));
            const now = new Date();
            const expiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
            session.expiresAt = expiresAt.toISOString();
        }
        
        const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
        await runTransaction(db, async (transaction) => {
            transaction.set(sessionRef, session);
        });
        return session;
    }
    
    if (session.status === 'finished') {
        // The contest is over, it can be cleared for a new one to start.
        const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
        await runTransaction(db, async (transaction) => {
            transaction.delete(sessionRef);
        });
        return null;
    }

    return session;
}


export async function joinAndGetContestState({ userId, username, plant }: { userId: string, username: string, plant?: Plant }): Promise<{ session?: ContestSession | null, error?: string }> {
    try {
        const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);

        // --- I. HANDLE EXPIRED SESSIONS ---
        // First, check if there's an existing session and if it needs to be finalized.
        const initialSessionDoc = await getDoc(sessionRef);
        let currentSession: ContestSession | null = initialSessionDoc.exists() ? initialSessionDoc.data() as ContestSession : null;
        currentSession = await finalizeExpiredSession(currentSession);


        // --- II. JOIN OR CREATE SESSION ---
        const finalSession = await runTransaction(db, async (transaction) => {
            const liveSessionDoc = await transaction.get(sessionRef);
            let liveSession: ContestSession | null = liveSessionDoc.exists() ? liveSessionDoc.data() as ContestSession : null;

            // If a session exists, use it. If not, and we're trying to join, create one.
            if (!liveSession) {
                if (plant) { // User wants to join, so we create a new session.
                    liveSession = createNewSession();
                } else { // User is just checking, not creating. No active session.
                    return null;
                }
            }
            
            // Add player if they are joining and it's the waiting phase
            if (plant && liveSession.status === 'waiting') {
                const alreadyExists = liveSession.contestants.some(c => c.ownerId === userId);
                if (!alreadyExists) {
                    const newContestant: Contestant = {
                        ...plant,
                        votes: 0,
                        voterIds: [],
                        ownerId: userId,
                        ownerName: username,
                    };
                    liveSession.contestants.push(newContestant);
                }
            }
            
            // Start voting if ready
            if (liveSession.status === 'waiting' && liveSession.contestants.length >= 2) {
                liveSession.status = 'voting';
                const now = new Date();
                const expiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                liveSession.expiresAt = expiresAt.toISOString();
            }

            transaction.set(sessionRef, liveSession);
            return liveSession;
        });

        return { session: finalSession };

    } catch (e: any) {
        console.error("Transaction failed: ", e);
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
