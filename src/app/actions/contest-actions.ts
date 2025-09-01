
'use server';

import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  writeBatch,
  Timestamp,
  runTransaction,
  deleteDoc,
  arrayUnion,
} from "firebase/firestore";
import type { Plant, ContestSession, Contestant } from '@/interfaces/plant';
import { awardContestPrize, getPlantById, getUserGameData } from "@/lib/firestore";

const LOBBY_EXPIRATION_MINUTES = 5;
const VOTING_TIME_SECONDS = 20;
const HEARTBEAT_TIMEOUT_SECONDS = 30;

// This is a maintenance function to handle sessions that have timed out.
export async function cleanupExpiredContests() {
    const now = Timestamp.now();
    const contestRef = collection(db, "contestSessions");

    // Firestore requires separate queries for 'in' and inequality filters.
    // We'll run two simple queries and merge the results.
    const waitingQuery = query(
        contestRef,
        where("status", "==", "waiting"),
        where("expiresAt", "<=", now)
    );
    const votingQuery = query(
        contestRef,
        where("status", "==", "voting"),
        where("expiresAt", "<=", now)
    );

    try {
        const [expiredWaitingSnapshot, expiredVotingSnapshot] = await Promise.all([
            getDocs(waitingQuery),
            getDocs(votingQuery)
        ]);

        const expiredSessions = [...expiredWaitingSnapshot.docs, ...expiredVotingSnapshot.docs];
        
        for (const doc of expiredSessions) {
            // Process expired contests one by one to avoid large batches.
            await processContestState(doc.id);
        }

    } catch (e: any) {
        console.error("Error during contest cleanup:", e);
        // If indexing is the issue, this helps identify it without crashing the whole flow.
        // It's better to fail cleanup silently than to block the entire lobby page.
    }
}

// Fetches all contests that are currently in the 'waiting' state.
export async function getActiveContests(): Promise<ContestSession[]> {
    const contestRef = collection(db, "contestSessions");
    const q = query(contestRef, where("status", "==", "waiting"));
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamps to serializable format (ISO strings)
        return {
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            expiresAt: (data.expiresAt as Timestamp).toDate().toISOString(),
        } as ContestSession;
    });
}


// Creates a new contest session and adds the host as the first contestant.
export async function createNewContest(userId: string, hostName: string, plantId: number): Promise<{ sessionId?: string; error?: string; }> {
    try {
        const gameData = await getUserGameData(userId);
        const plant = gameData?.plants?.[plantId];
        
        if (!plant) {
            throw new Error("Could not find the selected plant.");
        }
        
        const newSessionId = await runTransaction(db, async (transaction) => {
            
            const newSessionRef = doc(collection(db, "contestSessions"));
            const newContestantRef = doc(collection(newSessionRef, "contestants"));

            const newSession: Omit<ContestSession, 'id'> = {
                status: 'waiting',
                createdAt: Timestamp.now(),
                expiresAt: Timestamp.fromMillis(Date.now() + LOBBY_EXPIRATION_MINUTES * 60 * 1000),
                round: 1,
                contestantCount: 1,
                hostName: hostName,
            };

            const { id: plantNumericId, ...plantData } = plant;

            const newContestant: Contestant = {
                ...plantData,
                id: newContestantRef.id,
                ownerId: userId,
                ownerName: hostName,
                votes: 0,
                voterIds: [],
                lastSeen: Timestamp.now(),
            };

            transaction.set(newSessionRef, newSession);
            transaction.set(newContestantRef, newContestant);

            return newSessionRef.id;
        });

        return { sessionId: newSessionId };

    } catch (e: any) {
        console.error("Error creating new contest:", e);
        return { error: e.message || "An unknown error occurred while creating the contest." };
    }
}


// Allows a user to join an existing contest lobby.
export async function joinContest(sessionId: string, userId: string, displayName: string, plant: Plant): Promise<{ success: boolean, error?: string }> {
     try {
        const sessionRef = doc(db, "contestSessions", sessionId);

        await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists() || sessionDoc.data().status !== 'waiting') {
                throw new Error("This contest is no longer accepting new players.");
            }
            if (sessionDoc.data().contestantCount >= 4) {
                 throw new Error("This contest lobby is full.");
            }

            const contestantsRef = collection(sessionRef, "contestants");
            const existingContestantQuery = query(contestantsRef, where("ownerId", "==", userId));
            const existingContestantSnapshot = await getDocs(existingContestantQuery);

            if (!existingContestantSnapshot.empty) {
                throw new Error("You have already entered this contest.");
            }

            const newContestantRef = doc(contestantsRef);
            const { id: plantNumericId, ...plantData } = plant;
            const newContestant: Contestant = {
                ...plantData,
                id: newContestantRef.id,
                ownerId: userId,
                ownerName: displayName,
                votes: 0,
                voterIds: [],
                lastSeen: Timestamp.now(),
            };

            transaction.set(newContestantRef, newContestant);
            transaction.update(sessionRef, { contestantCount: increment(1) });
        });

        return { success: true };
    } catch (e: any) {
        console.error("Error joining contest:", e);
        return { success: false, error: e.message || "Failed to join contest." };
    }
}

// Records a vote for a specific contestant.
export async function voteForContestant(sessionId: string, voterId: string, contestantId: string): Promise<{ success: boolean, error?: string }> {
    try {
        const sessionRef = doc(db, "contestSessions", sessionId);
        const contestantRef = doc(sessionRef, "contestants", contestantId);

        await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists() || sessionDoc.data().status !== 'voting') {
                throw new Error("Voting for this contest has ended.");
            }
            
            const contestantsCollectionRef = collection(sessionRef, "contestants");
            const contestantsSnapshot = await getDocs(query(contestantsCollectionRef));
            const allContestants = contestantsSnapshot.docs.map(d => d.data() as Contestant);
            
            const alreadyVoted = allContestants.some(c => c.voterIds?.includes(voterId));
            if (alreadyVoted) {
                 throw new Error("You have already voted in this round.");
            }

            const contestantDoc = await transaction.get(contestantRef);
            if (!contestantDoc.exists()) {
                throw new Error("This contestant is no longer in the running.");
            }
            const contestantData = contestantDoc.data() as Contestant;
            if (contestantData.ownerId === voterId) {
                throw new Error("You cannot vote for your own plant.");
            }

            transaction.update(contestantRef, {
                votes: increment(1),
                voterIds: arrayUnion(voterId)
            });
        });
        
        return { success: true };

    } catch (e: any) {
        console.error("Error casting vote:", e);
        return { success: false, error: e.message || "Failed to cast vote." };
    }
}


// Updates a contestant's 'lastSeen' timestamp to keep them in the lobby.
export async function sendHeartbeat(sessionId: string, userId: string): Promise<void> {
    const contestantsRef = collection(db, "contestSessions", sessionId, "contestants");
    const q = query(contestantsRef, where("ownerId", "==", userId));
    
    try {
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const contestantDoc = snapshot.docs[0];
            await updateDoc(contestantDoc.ref, { lastSeen: Timestamp.now() });
        }
    } catch (error) {
        console.error("Error sending heartbeat:", error);
    }
}


// The core logic for advancing the contest state.
export async function processContestState(sessionId: string): Promise<void> {
    const sessionRef = doc(db, "contestSessions", sessionId);

    try {
        await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists()) throw new Error("Session not found.");
            
            const session = sessionDoc.data() as ContestSession;
            if (session.status === 'finished') return; // Already done

            const contestantsRef = collection(sessionRef, "contestants");
            const contestantsSnapshot = await getDocs(query(contestantsRef));
            const contestants = contestantsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Contestant));

            if (session.status === 'waiting') {
                // --- Logic for transitioning from WAITING to VOTING ---
                
                // 1. Remove inactive players
                const now = Timestamp.now().seconds;
                const activeContestants = contestants.filter(c => (now - c.lastSeen.seconds) < HEARTBEAT_TIMEOUT_SECONDS);
                
                if (activeContestants.length < contestants.length) {
                    const inactiveContestants = contestants.filter(c => !activeContestants.find(ac => ac.id === c.id));
                    for (const inactive of inactiveContestants) {
                       transaction.delete(doc(contestantsRef, inactive.id));
                    }
                    transaction.update(sessionRef, { contestantCount: activeContestants.length });
                }

                // 2. Check if we have enough players to start
                if (activeContestants.length < 2) {
                    // Not enough players, end the contest
                    transaction.update(sessionRef, { status: 'finished' });
                    return;
                }

                // 3. Start the first voting round
                transaction.update(sessionRef, {
                    status: 'voting',
                    expiresAt: Timestamp.fromMillis(Date.now() + VOTING_TIME_SECONDS * 1000)
                });
                
            } else if (session.status === 'voting') {
                // --- Logic for finishing a VOTING round ---
                
                if (contestants.length === 0) {
                    transaction.update(sessionRef, { status: 'finished' });
                    return;
                }

                // 1. Find the maximum number of votes
                const maxVotes = Math.max(...contestants.map(c => c.votes), 0);

                // 2. Find all contestants who have that many votes
                const potentialWinners = contestants.filter(c => c.votes === maxVotes);

                if (potentialWinners.length === 1) {
                    // 3a. We have a clear winner!
                    const winner = potentialWinners[0];
                    transaction.update(sessionRef, {
                        status: 'finished',
                        winner: winner,
                    });
                    // Prize will be awarded outside the transaction
                } else {
                    // 3b. There's a tie, start a new round with only the tied players.
                    const contestantsToEliminate = contestants.filter(c => c.votes < maxVotes);
                    for (const loser of contestantsToEliminate) {
                        transaction.delete(doc(contestantsRef, loser.id));
                    }

                    // Reset votes for the next round for those who are left
                    for (const tiedPlayer of potentialWinners) {
                         transaction.update(doc(contestantsRef, tiedPlayer.id), { votes: 0, voterIds: [] });
                    }
                    
                    transaction.update(sessionRef, {
                        round: increment(1),
                        expiresAt: Timestamp.fromMillis(Date.now() + VOTING_TIME_SECONDS * 1000),
                        contestantCount: potentialWinners.length,
                    });
                }
            }
        });

        // Award prize outside of main transaction if a winner was determined.
        const finalSessionStateDoc = await getDoc(sessionRef);
        if (finalSessionStateDoc.exists()) {
            const finalSessionState = finalSessionStateDoc.data() as ContestSession;
            if (finalSessionState?.status === 'finished' && finalSessionState.winner) {
                await awardContestPrize(finalSessionState.winner.ownerId);
            }
        }

    } catch (e: any) {
        console.error(`Failed to process state for session ${sessionId}:`, e);
        try {
            await updateDoc(sessionRef, { status: 'finished' });
        } catch (updateError) {
             console.error(`Failed to even mark session ${sessionId} as finished:`, updateError);
        }
    }
}
