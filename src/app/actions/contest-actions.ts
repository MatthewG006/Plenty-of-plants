
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
import { getUserGameData, awardContestPrize } from "@/lib/firestore";

const LOBBY_EXPIRATION_MINUTES = 3;
const VOTING_TIME_SECONDS = 30;
const HEARTBEAT_TIMEOUT_SECONDS = 30;

export async function cleanupExpiredContests() {
    const now = Timestamp.now();
    const contestRef = collection(db, "contestSessions");

    // Separate queries to avoid needing a composite index
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
            await processContestState(doc.id);
        }

    } catch (e: any) {
        console.error("Error during contest cleanup:", e);
    }
}

export async function getActiveContests(): Promise<ContestSession[]> {
    const contestRef = collection(db, "contestSessions");
    const q = query(contestRef, where("status", "==", "waiting"));
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt;
        const expiresAt = data.expiresAt;

        return {
            id: doc.id,
            ...data,
            createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : createdAt,
            expiresAt: expiresAt?.toDate ? expiresAt.toDate().toISOString() : expiresAt,
        } as ContestSession;
    });
}

export async function createNewContest(userId: string, hostName: string, plantId: number): Promise<{ sessionId?: string; error?: string; }> {
    try {
        const gameData = await getUserGameData(userId);
        if (!gameData?.plants) {
             throw new Error("User game data or plants not found.");
        }
        
        const plant = gameData.plants[plantId];

        // --- Start of Added Logs ---
        console.log("Game Data:", gameData);
        console.log("Plant ID passed:", plantId);
        console.log("Plant found:", plant);
        // --- End of Added Logs ---
        
        if (!plant) {
            throw new Error("Could not find the selected plant.");
        }
        
        const newSessionId = await runTransaction(db, async (transaction) => {
            const newSessionRef = doc(collection(db, "contestSessions"));
            
            const newSessionData: Omit<ContestSession, 'id'> = {
                status: 'waiting',
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromMillis(Date.now() + LOBBY_EXPIRATION_MINUTES * 60 * 1000),
                round: 1,
                contestantCount: 1,
                hostName: hostName,
            };
            transaction.set(newSessionRef, newSessionData);
            
            const newContestantRef = doc(collection(newSessionRef, "contestants"));
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

            transaction.set(newContestantRef, newContestant);

            return newSessionRef.id;
        });

        return { sessionId: newSessionId };

    } catch (e: any) {
        console.error("Error creating new contest:", e);
        return { error: e.message || "An unknown error occurred while creating the contest." };
    }
}

export async function joinContest(sessionId: string, userId: string, displayName: string, plant: Plant): Promise<{ success: boolean, error?: string }> {
     try {
        await runTransaction(db, async (transaction) => {
            const sessionRef = doc(db, "contestSessions", sessionId);
            const sessionDoc = await transaction.get(sessionRef);

            if (!sessionDoc.exists() || sessionDoc.data().status !== 'waiting') {
                throw new Error("This contest is no longer accepting new players.");
            }
            if (sessionDoc.data().contestantCount >= 4) {
                 throw new Error("This contest lobby is full.");
            }

            const contestantsRef = collection(sessionRef, "contestants");
            const q = query(contestantsRef, where("ownerId", "==", userId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Check if the contestant doc belongs to a DIFFERENT session, indicating stale data.
                // This is a defensive check in case cleanup fails.
                const isStale = querySnapshot.docs.some(doc => doc.ref.parent.parent?.id !== sessionId);
                if (!isStale) {
                    throw new Error("You have already entered this contest.");
                }
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

export async function voteForContestant(sessionId: string, voterId: string, contestantId: string): Promise<{ success: boolean, error?: string }> {
    try {
        await runTransaction(db, async (transaction) => {
            const sessionRef = doc(db, "contestSessions", sessionId);
            const contestantToVoteForRef = doc(sessionRef, "contestants", contestantId);

            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists() || sessionDoc.data().status !== 'voting') {
                throw new Error("Voting for this contest has ended.");
            }
            
            const contestantsCollectionRef = collection(sessionRef, "contestants");
            const contestantsSnapshot = await transaction.get(query(contestantsCollectionRef));
            const allContestants = contestantsSnapshot.docs.map(d => d.data() as Contestant);
            
            const alreadyVoted = allContestants.some(c => c.voterIds?.includes(voterId));
            if (alreadyVoted) {
                 throw new Error("You have already voted in this round.");
            }

            const contestantDoc = await transaction.get(contestantToVoteForRef);
            if (!contestantDoc.exists()) {
                throw new Error("This contestant is no longer in the running.");
            }
            const contestantData = contestantDoc.data() as Contestant;
            if (contestantData.ownerId === voterId) {
                throw new Error("You cannot vote for your own plant.");
            }

            transaction.update(contestantToVoteForRef, {
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

export async function processContestState(sessionId: string): Promise<void> {
    const sessionRef = doc(db, "contestSessions", sessionId);

    try {
        await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists()) throw new Error("Session not found.");
            
            const session = sessionDoc.data();
            if (session.status === 'finished') return;

            const contestantsRef = collection(sessionRef, "contestants");
            const contestantsSnapshot = await transaction.get(query(contestantsRef));
            const contestants = contestantsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Contestant));

            if (session.status === 'waiting') {
                const now = Timestamp.now().seconds;
                const activeContestants = contestants.filter(c => (now - (c.lastSeen?.seconds || 0)) < HEARTBEAT_TIMEOUT_SECONDS);
                
                if (activeContestants.length < contestants.length) {
                    const inactiveContestants = contestants.filter(c => !activeContestants.find(ac => ac.id === c.id));
                    for (const inactive of inactiveContestants) {
                       transaction.delete(doc(contestantsRef, inactive.id));
                    }
                    transaction.update(sessionRef, { contestantCount: activeContestants.length });
                }

                if (activeContestants.length < 2) {
                    transaction.update(sessionRef, { status: 'finished', winner: null });
                    return;
                }

                transaction.update(sessionRef, {
                    status: 'voting',
                    expiresAt: Timestamp.fromMillis(Date.now() + VOTING_TIME_SECONDS * 1000)
                });
                
            } else if (session.status === 'voting') {
                if (contestants.length === 0) {
                    transaction.update(sessionRef, { status: 'finished', winner: null });
                    return;
                }

                const maxVotes = Math.max(...contestants.map(c => c.votes || 0), 0);
                const potentialWinners = contestants.filter(c => (c.votes || 0) === maxVotes);

                if (potentialWinners.length === 1 && contestants.length > 1) {
                    const winner = potentialWinners[0];
                    transaction.update(sessionRef, {
                        status: 'finished',
                        winner: winner,
                    });
                } else {
                    const contestantsToEliminate = contestants.filter(c => (c.votes || 0) < maxVotes);
                    for (const loser of contestantsToEliminate) {
                        transaction.delete(doc(contestantsRef, loser.id));
                    }

                    const batch = writeBatch(db); // Use a batch within the transaction for multiple non-read ops
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

        // Awarding prize is done outside the transaction to avoid contention
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

    