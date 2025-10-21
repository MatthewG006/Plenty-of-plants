
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

export async function startContestManually(sessionId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const sessionRef = doc(db, "contestSessions", sessionId);

    try {
        await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists()) throw new Error("Session not found.");
            
            const session = sessionDoc.data() as ContestSession;
            if (session.status !== 'waiting') throw new Error("The contest has already started.");
            if (session.hostId !== userId) throw new Error("Only the host can start the contest.");

            const contestantsRef = collection(sessionRef, "contestants");
            const contestantsSnapshot = await getDocs(query(contestantsRef));
            const contestants = contestantsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Contestant));

            if (contestants.length < 2) {
                throw new Error("You need at least 2 players to start the contest.");
            }
            
            transaction.update(sessionRef, {
                status: 'voting',
                expiresAt: Timestamp.fromMillis(Date.now() + VOTING_TIME_SECONDS * 1000)
            });
        });
        return { success: true };
    } catch (e: any) {
        console.error("Error starting contest manually:", e);
        return { success: false, error: e.message || "Could not start the contest." };
    }
}


export async function cleanupExpiredContests() {
    const now = Timestamp.now();
    const contestRef = collection(db, "contestSessions");

    const expiredQuery = query(
        contestRef,
        where("status", "!=", "finished"),
        where("expiresAt", "<=", now)
    );

    try {
        const expiredSnapshot = await getDocs(expiredQuery);
        
        for (const doc of expiredSnapshot.docs) {
            // Process state without awaiting, allowing them to run in parallel
            processContestState(doc.id);
        }

    } catch (e: any) {
        console.error("Error during contest cleanup:", e);
    }
}

export async function getActiveContests(): Promise<ContestSession[]> {
    const contestRef = collection(db, "contestSessions");
    const q = query(contestRef, where("status", "==", "waiting"));
    
    const snapshot = await getDocs(q);

    const safeTimestampToISO = (ts: any): string => {
        if (!ts) return new Date().toISOString();
        if (ts.toDate) return ts.toDate().toISOString(); 
        return new Date(ts).toISOString();
    };
    
    const sessions: ContestSession[] = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        sessions.push({
            id: doc.id,
            ...data,
            createdAt: safeTimestampToISO(data.createdAt),
            expiresAt: safeTimestampToISO(data.expiresAt),
        } as ContestSession);
    });

    return sessions;
}

export async function createNewContest(userId: string, hostName: string, plant: Plant): Promise<{ sessionId?: string; error?: string; }> {
    try {
        if (!plant) {
            throw new Error("A valid plant must be provided to create a contest.");
        }
        
        const newSessionId = await runTransaction(db, async (transaction) => {
            const newSessionRef = doc(collection(db, "contestSessions"));
            
            const newSessionData: Omit<ContestSession, 'id'> = {
                status: 'waiting',
                createdAt: Timestamp.now(),
                expiresAt: Timestamp.fromMillis(Date.now() + LOBBY_EXPIRATION_MINUTES * 60 * 1000),
                round: 1,
                contestantCount: 1,
                hostId: userId,
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
            const contestantsSnapshotDocs = await getDocs(query(contestantsCollectionRef));
            const allContestants = contestantsSnapshotDocs.docs.map(d => d.data() as Contestant);
            
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
            if (!sessionDoc.exists() || sessionDoc.data().status === 'finished') return;

            const session = sessionDoc.data();
            const contestantsRef = collection(sessionRef, "contestants");
            const contestantsSnapshot = await transaction.get(query(contestantsRef));
            let contestants = contestantsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Contestant));

            if (session.status === 'waiting') {
                const now = Timestamp.now().seconds;
                const activeContestants = contestants.filter(c => (now - (c.lastSeen?.seconds || 0)) < HEARTBEAT_TIMEOUT_SECONDS);
                
                if (activeContestants.length < contestants.length) {
                    const inactiveContestantIds = contestants.filter(c => !activeContestants.find(ac => ac.id === c.id)).map(c => c.id);
                    inactiveContestantIds.forEach(id => transaction.delete(doc(contestantsRef, id)));
                    transaction.update(sessionRef, { contestantCount: activeContestants.length });
                    contestants = activeContestants;
                }

                if (contestants.length >= 2) {
                     transaction.update(sessionRef, {
                        status: 'voting',
                        expiresAt: Timestamp.fromMillis(Date.now() + VOTING_TIME_SECONDS * 1000)
                    });
                } else {
                     transaction.update(sessionRef, { status: 'finished', winner: null });
                }
                return;
            }

            if (session.status === 'voting') {
                if (contestants.length === 0) {
                    transaction.update(sessionRef, { status: 'finished', winner: null });
                    return;
                }
                if (contestants.length === 1) {
                    transaction.update(sessionRef, { status: 'finished', winner: contestants[0] });
                    await awardContestPrize(contestants[0].ownerId);
                    return;
                }

                const maxVotes = Math.max(...contestants.map(c => c.votes || 0), 0);
                const winners = contestants.filter(c => (c.votes || 0) === maxVotes);
                const losers = contestants.filter(c => (c.votes || 0) < maxVotes);

                if (winners.length === 1) {
                    transaction.update(sessionRef, { status: 'finished', winner: winners[0] });
                    await awardContestPrize(winners[0].ownerId);
                } else {
                    // There's a tie, so eliminate the losers and start a new round with the winners.
                    losers.forEach(loser => transaction.delete(doc(contestantsRef, loser.id)));
                    
                    winners.forEach(winner => {
                        transaction.update(doc(contestantsRef, winner.id), { votes: 0, voterIds: [] });
                    });
                    
                    transaction.update(sessionRef, {
                        round: increment(1),
                        expiresAt: Timestamp.fromMillis(Date.now() + VOTING_TIME_SECONDS * 1000),
                        contestantCount: winners.length,
                    });
                }
            }
        });
    } catch (e: any) {
        console.error(`Failed to process state for session ${sessionId}:`, e);
        try {
            await updateDoc(sessionRef, { status: 'finished', error: e.message });
        } catch (updateError) {
            console.error(`Failed to mark session ${sessionId} as finished:`, updateError);
        }
    }
}
