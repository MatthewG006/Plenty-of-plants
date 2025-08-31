
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, getDoc, writeBatch, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where, Timestamp, orderBy, limit, documentId, setDoc, increment, arrayUnion } from 'firebase/firestore';
import type { Plant, ContestSession, Contestant } from '@/interfaces/plant';
import { awardContestPrize, getUserGameData } from '@/lib/firestore';

const WAITING_TIME_SEC = 30;
const VOTE_TIME_SEC = 20;
const PLAYER_TIMEOUT_SEC = 15; // A player is considered disconnected after this many seconds of inactivity

// Helper to get contestants subcollection ref
const getContestantsRef = (sessionId: string) => collection(db, 'contestSessions', sessionId, 'contestants');

// Helper function to create a new, empty contest session
function createNewSession(hostName: string): Omit<ContestSession, 'id' | 'contestants'> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + WAITING_TIME_SEC * 1000);
    return {
        status: 'waiting',
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
        round: 1,
        contestantCount: 0, // Starts with 0, will be incremented
        hostName: hostName,
    };
}

export async function createNewContest(userId: string, username: string, plantId: number): Promise<{ sessionId?: string, error?: string }> {
    try {
        // Check if the user is already in any active contest
        const anyContestQuery = query(
            collection(db, 'contestSessions'),
            where('status', 'in', ['waiting', 'voting'])
        );
        const existingSessionsSnapshot = await getDocs(anyContestQuery);
        for (const sessionDoc of existingSessionsSnapshot.docs) {
            const contestantDoc = await getDoc(doc(db, 'contestSessions', sessionDoc.id, 'contestants', userId));
            if (contestantDoc.exists()) {
                throw new Error("You are already in an active contest.");
            }
        }
        
        const gameData = await getUserGameData(userId);
        if (!gameData || !gameData.plants) {
            throw new Error("Could not find user's plant data.");
        }
        
        const plant = gameData.plants[plantId];
        if (!plant) {
            throw new Error("The selected plant could not be found in your collection.");
        }

        // Create the session document first
        const newSessionData = createNewSession(username);
        const sessionRef = await addDoc(collection(db, 'contestSessions'), newSessionData);
        
        // Now, create the contestant in a transaction to add them and update the count
        await runTransaction(db, async (transaction) => {
            const liveSessionDoc = await transaction.get(sessionRef);
            if (!liveSessionDoc.exists()) {
                throw new Error("Contest session disappeared before user could be added.");
            }

            const newContestant: Contestant = {
                ...plant,
                id: userId,
                votes: 0,
                voterIds: [],
                ownerId: userId,
                ownerName: username,
                lastSeen: Timestamp.fromDate(new Date()),
            };

            const contestantRef = doc(getContestantsRef(sessionRef.id), userId);
            transaction.set(contestantRef, newContestant);
            transaction.update(sessionRef, { contestantCount: increment(1) });
        });

        return { sessionId: sessionRef.id };
    } catch (e: any) {
        console.error("Failed to create contest:", e);
        return { error: e.message || "An unknown error occurred while creating the contest." };
    }
}

export async function joinContest(sessionId: string, userId: string, username: string, plant: Plant): Promise<{ success: boolean, error?: string }> {
     try {
        const anyContestQuery = query(collection(db, 'contestSessions'), where('status', 'in', ['waiting', 'voting']));
        const existingSessionsSnapshot = await getDocs(anyContestQuery);
        for (const sessionDoc of existingSessionsSnapshot.docs) {
            const contestantDoc = await getDoc(doc(db, 'contestSessions', sessionDoc.id, 'contestants', userId));
            if (contestantDoc.exists()) {
                throw new Error("You are already in an active contest.");
            }
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
            if (session.contestantCount >= 4) {
                throw new Error("This contest lobby is full.");
            }
            
            const contestantRef = doc(getContestantsRef(sessionId), userId);
            const liveContestantDoc = await transaction.get(contestantRef);
            if (liveContestantDoc.exists()) {
                throw new Error("You have already entered this contest.");
            }

            const newContestant: Omit<Contestant, 'id'> = {
                ...plant,
                votes: 0,
                voterIds: [],
                ownerId: userId,
                ownerName: username,
                lastSeen: Timestamp.fromDate(new Date()),
            };
            
            transaction.set(contestantRef, newContestant);
            
            const newCount = session.contestantCount + 1;
            
            // If the lobby just became full, automatically start the voting.
            if (newCount >= 4) {
                transaction.update(sessionRef, { 
                    contestantCount: newCount,
                    status: 'voting',
                    expiresAt: Timestamp.fromDate(new Date(Date.now() + VOTE_TIME_SEC * 1000))
                });
            } else {
                 transaction.update(sessionRef, { contestantCount: newCount });
            }
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
                const contestantsRef = getContestantsRef(sessionId);
                const contestantsSnap = await getDocs(contestantsRef);
                const timeoutThreshold = new Date(now.getTime() - PLAYER_TIMEOUT_SEC * 1000);

                let activeContestants: Contestant[] = [];
                const batch = writeBatch(db);

                contestantsSnap.forEach(doc => {
                    const c = { id: doc.id, ...doc.data() } as Contestant;
                    if ((c.lastSeen as Timestamp).toDate() > timeoutThreshold) {
                        activeContestants.push(c);
                    } else {
                        batch.delete(doc.ref); // Remove idle player
                    }
                });

                await batch.commit();

                if (activeContestants.length >= 2) { 
                    transaction.update(sessionRef, {
                        status: 'voting',
                        expiresAt: Timestamp.fromDate(new Date(now.getTime() + VOTE_TIME_SEC * 1000)),
                        contestantCount: activeContestants.length,
                    });
                } else {
                    // Not enough players, the contest is a dud. Delete it and its subcollection.
                    const finalContestantsSnap = await getDocs(contestantsRef);
                    const deleteBatch = writeBatch(db);
                    finalContestantsSnap.forEach(doc => deleteBatch.delete(doc.ref));
                    await deleteBatch.commit();
                    transaction.delete(sessionRef);
                    return; 
                }
            } else if (session.status === 'voting') {
                const contestantsRef = getContestantsRef(sessionId);
                const contestantsSnap = await getDocs(query(contestantsRef));
                const contestants = contestantsSnap.docs.map(d => ({id: d.id, ...d.data()}) as Contestant);

                if (contestants.length === 0) {
                    transaction.delete(sessionRef); // No contestants left, delete session
                    return;
                }

                let maxVotes = -1;
                let winners: Contestant[] = [];
                contestants.forEach(c => {
                    if (c.votes > maxVotes) {
                        maxVotes = c.votes;
                        winners = [c];
                    } else if (c.votes === maxVotes) {
                        winners.push(c);
                    }
                });

                if (winners.length === 1) { // We have a clear winner
                    session.winner = winners[0];
                    transaction.update(sessionRef, { status: 'finished', winner: session.winner });
                    if (session.winner) {
                        await awardContestPrize(session.winner.ownerId);
                    }
                } else { // Tie or no votes, start a new round
                    const batch = writeBatch(db);
                    // If it's a true tie (e.g. 1 vs 1), all contestants go to next round.
                    // If some players got 0 votes and some are tied, only tied players advance.
                    const tiedPlayers = (winners.length > 0 && winners.length < contestants.length) ? winners : contestants;

                    const allContestantIds = new Set(contestants.map(c => c.id));
                    const tiedPlayerIds = new Set(tiedPlayers.map(c => c.id));

                    // Remove non-tied players from the subcollection
                    for (const id of allContestantIds) {
                        if (!tiedPlayerIds.has(id)) {
                             batch.delete(doc(contestantsRef, id));
                        }
                    }

                    // Reset votes for the players who are advancing
                    tiedPlayers.forEach(c => {
                        batch.update(doc(contestantsRef, c.id), { votes: 0, voterIds: [] });
                    });
                    
                    await batch.commit();

                    transaction.update(sessionRef, {
                        status: 'voting',
                        round: session.round + 1,
                        expiresAt: Timestamp.fromDate(new Date(now.getTime() + VOTE_TIME_SEC * 1000)),
                        contestantCount: tiedPlayers.length,
                    });
                }
            }
        });

    } catch (e: any) {
        console.error("Contest state processing failed: ", e);
    }
}


export async function voteForContestant(sessionId: string, voterId: string, votedForId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const contestantRef = doc(getContestantsRef(sessionId), votedForId);
        const sessionRef = doc(db, 'contestSessions', sessionId);

        await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists() || sessionDoc.data().status !== 'voting') {
                throw new Error("Voting is not active.");
            }

            const contestantDoc = await transaction.get(contestantRef);
            if (!contestantDoc.exists()) {
                throw new Error("This plant is not in the current contest round.");
            }
            
            const contestant = contestantDoc.data() as Contestant;
            if (contestant.ownerId === voterId) {
                throw new Error("You cannot vote for your own plant.");
            }
            
            // Check if user has already voted for anyone in this round
            const allContestantsQuery = query(getContestantsRef(sessionId));
            const allContestantsSnap = await getDocs(allContestantsQuery);
            for(const doc of allContestantsSnap.docs) {
                const c = doc.data() as Contestant;
                if(c.voterIds?.includes(voterId)) {
                    throw new Error("You have already voted in this round.");
                }
            }
            
            transaction.update(contestantRef, {
                votes: increment(1),
                voterIds: arrayUnion(voterId)
            });
        });

        return { success: true };
    } catch (e: any) {
        console.error("Vote transaction failed: ", e);
        return { success: false, error: e.message || 'Failed to cast vote.' };
    }
}


export async function sendHeartbeat(sessionId: string, userId: string) {
    const contestantRef = doc(getContestantsRef(sessionId), userId);
    try {
        // Use a simple update, no need for transaction for a heartbeat.
        await updateDoc(contestantRef, { lastSeen: Timestamp.fromDate(new Date()) });
    } catch (error) {
        if ((error as any).code !== 'not-found') {
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
        if (querySnapshot.empty) return;
        
        const batch = writeBatch(db);
        for (const sessionDoc of querySnapshot.docs) {
            const contestantsRef = getContestantsRef(sessionDoc.id);
            const contestantsSnap = await getDocs(contestantsRef);
            contestantsSnap.forEach(contestantDoc => {
                batch.delete(contestantDoc.ref);
            });
            batch.delete(sessionDoc.ref);
        }

        await batch.commit();

    } catch (e: any) {
        console.warn("Contest cleanup transaction failed:", e.message);
    }
}

export async function getActiveContests(): Promise<ContestSession[]> {
    const contests: ContestSession[] = [];
    try {
        const q = query(
            collection(db, 'contestSessions'),
            where('status', '==', 'waiting'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            contests.push({ id: doc.id, ...(doc.data() as Omit<ContestSession, 'id'>) });
        });
        return contests;
    } catch (e) {
        console.error("Error getting active contests", e);
        return [];
    }
}

    