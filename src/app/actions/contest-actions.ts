
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, getDoc, writeBatch, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import type { Plant, ContestSession, Contestant } from '@/interfaces/plant';
import { awardContestPrize } from '@/lib/firestore';

const WAITING_TIME_SEC = 30;
const VOTE_TIME_SEC = 20;
const PLAYER_TIMEOUT_SEC = 15; // A player is considered disconnected after this many seconds of inactivity

// Helper function to check if a user is already in any active contest
async function isUserInAnyContest(userId: string): Promise<boolean> {
    const q = query(
        collection(db, 'contestSessions'),
        where('contestants', 'array-contains', { ownerId: userId }) // This is a simplified query; Firestore can't query deep in arrays of objects this way.
                                                                    // A more scalable solution would be a separate user status field.
                                                                    // For now, we will have to fetch and filter client-side or with more complex queries if needed.
                                                                    // Let's adjust this to a more robust query.
    );
    
    const contestsRef = collection(db, 'contestSessions');
    const snapshot = await getDocs(contestsRef);
    
    for (const doc of snapshot.docs) {
        const session = doc.data() as ContestSession;
        if (session.contestants?.some(c => c.ownerId === userId)) {
            return true; // User found in at least one contest
        }
    }

    return false;
}


// Helper to create a new, empty contest session
function createNewSession(plant: Contestant): Omit<ContestSession, 'id'> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + WAITING_TIME_SEC * 1000);
    return {
        status: 'waiting',
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
        round: 1,
        contestants: [plant],
    };
}


export async function createNewContest(userId: string, username: string, plant: Plant): Promise<{ sessionId?: string, error?: string }> {
    try {
        if (await isUserInAnyContest(userId)) {
            throw new Error("You are already in an active contest.");
        }

        const newContestant: Contestant = {
            ...plant,
            id: plant.id,
            votes: 0,
            voterIds: [],
            ownerId: userId,
            ownerName: username,
            lastSeen: Timestamp.fromDate(new Date()),
        };
        const newSessionData = createNewSession(newContestant);
        const sessionRef = await addDoc(collection(db, 'contestSessions'), newSessionData);
        return { sessionId: sessionRef.id };
    } catch (e: any) {
        console.error("Failed to create contest:", e);
        return { error: e.message || "Could not start a new contest." };
    }
}


export async function joinContest(sessionId: string, userId: string, username: string, plant: Plant): Promise<{ success: boolean, error?: string }> {
     try {
        if (await isUserInAnyContest(userId)) {
            throw new Error("You are already in an active contest.");
        }

        const sessionRef = doc(db, 'contestSessions', sessionId);
        await runTransaction(db, async (transaction) => {
            const liveSessionDoc = await transaction.get(sessionRef);
            if (!liveSessionDoc.exists()) {
                throw new Error("This contest lobby no longer exists.");
            }
            
            let session = liveSessionDoc.data() as ContestSession;
             if (session.status !== 'waiting') {
                throw new Error("This contest is no longer accepting new players.");
            }

            const alreadyExists = session.contestants.some(c => c.ownerId === userId);
            if (alreadyExists) {
                 // This is a redundant check if isUserInAnyContest works, but good for safety.
                 throw new Error("You have already entered this contest.");
            }
            if (session.contestants.length >= 4) {
                throw new Error("This contest lobby is full.");
            }

            const newContestant: Contestant = {
                ...plant,
                votes: 0,
                id: plant.id,
                voterIds: [],
                ownerId: userId,
                ownerName: username,
                lastSeen: Timestamp.fromDate(new Date()),
            };
            
            session.contestants.push(newContestant);

            // If the lobby just became full, automatically start the voting.
            if (session.contestants.length >= 4) {
                session.status = 'voting';
                const now = new Date();
                const expiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                session.expiresAt = Timestamp.fromDate(expiresAt);
            }

            transaction.set(sessionRef, session);
        });

        return { success: true };
    } catch (e: any) {
        console.error("Failed to join contest:", e);
        return { success: false, error: e.message || "Could not join the contest." };
    }
}

export async function processContestState(sessionId: string): Promise<void> {
    try {
        const sessionRef = doc(db, 'contestSessions', sessionId);
        
        await runTransaction(db, async (transaction) => {
            const liveSessionDoc = await transaction.get(sessionRef);
            
            if (!liveSessionDoc.exists()) {
                return; // Session was likely cleaned up already.
            }
            
            let session = liveSessionDoc.data() as ContestSession;
            const now = new Date();
            const expires = (session.expiresAt as Timestamp).toDate();
            
            if (now < expires) {
                return; // Not expired yet, nothing to do.
            }

            // Handle state transition if expired
            if (session.status === 'waiting') {
                // Before starting, remove any idle players.
                const timeoutThreshold = new Date(now.getTime() - PLAYER_TIMEOUT_SEC * 1000);
                session.contestants = session.contestants.filter(c => (c.lastSeen as Timestamp).toDate() > timeoutThreshold);
                
                // A waiting lobby has expired. It needs at least 2 players to start.
                if (session.contestants.length >= 2) { 
                    session.status = 'voting';
                    const newExpiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                    session.expiresAt = Timestamp.fromDate(newExpiresAt);
                } else {
                    // Not enough players, the contest is a dud. Delete it.
                    transaction.delete(sessionRef);
                    return; 
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
                    const nextRoundContestants = winners.length > 0 && winners.length < session.contestants.length ? winners : session.contestants;
                    session.contestants = nextRoundContestants.map(c => ({...c, votes: 0, voterIds: [] }));
                    const newExpiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                    session.expiresAt = Timestamp.fromDate(newExpiresAt);
                }
            }

            transaction.set(sessionRef, session);
        });

    } catch (e: any) {
        console.error("Contest state processing failed: ", e);
    }
}


export async function voteForContestant(sessionId: string, userId: string, plantId: number): Promise<{ success: boolean; error?: string }> {
    try {
        await runTransaction(db, async (transaction) => {
            const sessionRef = doc(db, 'contestSessions', sessionId);
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


export async function sendHeartbeat(sessionId: string, userId: string) {
    const sessionRef = doc(db, 'contestSessions', sessionId);

    try {
        await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists()) return;

            const sessionData = sessionDoc.data() as ContestSession;
            if (sessionData.status !== 'waiting') return;

            const contestantIndex = sessionData.contestants.findIndex(c => c.ownerId === userId);
            if (contestantIndex !== -1) {
                sessionData.contestants[contestantIndex].lastSeen = Timestamp.fromDate(new Date());
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


export async function cleanupExpiredContests(): Promise<void> {
    try {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
        
        const q = query(
            collection(db, 'contestSessions'), 
            where('createdAt', '<', Timestamp.fromDate(oneHourAgo))
        );

        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        if (!querySnapshot.empty) {
            await batch.commit();
        }

    } catch (e: any) {
        console.warn("Contest cleanup transaction failed:", e.message);
    }
}

export async function getActiveContests(): Promise<ContestSession[]> {
    const contests: ContestSession[] = [];
    try {
        const now = new Date();
        const timeoutThreshold = new Date(now.getTime() - PLAYER_TIMEOUT_SEC * 1000);
        
        const q = query(
            collection(db, 'contestSessions'),
            where('status', '==', 'waiting')
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const session = { id: doc.id, ...doc.data() } as ContestSession;
            
            // Filter out idle players for the count, but keep them in the main data for now
            const activePlayers = session.contestants.filter(c => (c.lastSeen as Timestamp).toDate() > timeoutThreshold);

            // Only show lobbies that have at least one active player
            if (activePlayers.length > 0) {
                 contests.push(session);
            }
        });
        return contests.sort((a,b) => (b.createdAt as Timestamp).toMillis() - (a.createdAt as Timestamp).toMillis());
    } catch (e) {
        console.error("Error getting active contests", e);
        return [];
    }
}

    