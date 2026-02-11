
'use server';

import { db } from '@/lib/firebase';
import {
    doc,
    runTransaction,
    collection,
    query,
    where,
    getDocs,
    Timestamp,
    increment,
    arrayUnion,
    serverTimestamp,
    deleteDoc,
    writeBatch,
    updateDoc,
    getDoc,
  } from 'firebase/firestore';
import type { Plant, ContestSession, Contestant } from '@/interfaces/plant';
import { getUserGameData, awardContestPrize } from "@/lib/firestore";

export async function getActiveContests(): Promise<ContestSession[]> {
  console.warn("DEPRECATED: getActiveContests should be called from the client.");
  return [];
}

export async function createNewContest(userId: string, hostName: string, plant: Plant): Promise<{ sessionId?: string; error?: string; }> {
  console.warn("DEPRECATED: createNewContest should be called from the client.");
  return { error: "This function is deprecated." };
}

export async function joinContest(sessionId: string, userId: string, displayName: string, plant: Plant): Promise<{ success: boolean, error?: string }> {
  console.warn("DEPRECATED: joinContest should be called from the client.");
  return { success: false, error: "This function is deprecated." };
}

export async function voteForContestant(sessionId: string, voterId: string, contestantId: string): Promise<{ success: boolean, error?: string }> {
  console.warn("DEPRECATED: voteForContestant should be called from the client.");
  return { success: false, error: "This function is deprecated." };
}

export async function sendHeartbeat(sessionId: string, userId: string): Promise<void> {
    const contestantsRef = collection(db, `contestSessions/${sessionId}/contestants`);
    const q = query(contestantsRef, where("ownerId", "==", userId));
    
    try {
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const contestantDoc = snapshot.docs[0];
            await updateDoc(contestantDoc.ref, { lastSeen: serverTimestamp() });
        }
    } catch (error) {
        console.error("Error sending heartbeat:", error);
    }
}


export async function processContestState(sessionId: string): Promise<void> {
  const sessionRef = doc(db, `contestSessions/${sessionId}`);
  const contestantsRef = collection(sessionRef, "contestants");

  try {
    const contestantsSnapshot = await getDocs(query(contestantsRef));
    let contestants = contestantsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Contestant));

    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists() || sessionDoc.data()!.status === 'finished') return;

      const session = sessionDoc.data()!;

      if (session.status === 'waiting') {
        const now = Timestamp.now().seconds;
        const activeContestants = contestants.filter(c => c.lastSeen && (now - (c.lastSeen as any).seconds) < 30);

        if (activeContestants.length < contestants.length) {
          const activeIds = new Set(activeContestants.map(c => c.id));
          const inactiveContestantIds = contestants.filter(c => !activeIds.has(c.id)).map(c => c.id);

          for (const id of inactiveContestantIds) {
            transaction.delete(doc(contestantsRef, id));
          }
          transaction.update(sessionRef, { contestantCount: activeContestants.length });
          contestants = activeContestants;
        }

        if (contestants.length >= 2) {
          transaction.update(sessionRef, {
            status: 'voting',
            expiresAt: Timestamp.fromMillis(Date.now() + 30 * 1000)
          });
        } else {
          transaction.update(sessionRef, { status: 'finished', winner: null, expiresAt: Timestamp.now() });
        }
        return;
      }

      if (session.status === 'voting') {
        if (contestants.length <= 1) {
          const winner = contestants[0] || null;
          transaction.update(sessionRef, { status: 'finished', winner: winner, expiresAt: Timestamp.now() });
          if (winner) {
            await awardContestPrize(winner.ownerId);
          }
          return;
        }

        const maxVotes = Math.max(...contestants.map(c => c.votes || 0), 0);
        const winners = contestants.filter(c => (c.votes || 0) === maxVotes);

        if (winners.length === 1) {
          const winner = winners[0];
          transaction.update(sessionRef, { status: 'finished', winner: winner, expiresAt: Timestamp.now() });
          await awardContestPrize(winner.ownerId);
        } else {
            const losers = contestants.filter(c => (c.votes || 0) < maxVotes);
            
            losers.forEach(loser => transaction.delete(doc(contestantsRef, loser.id)));
            
            winners.forEach(winner => {
                transaction.update(doc(contestantsRef, winner.id), { votes: 0, voterIds: [] });
            });

            transaction.update(sessionRef, {
                round: increment(1),
                expiresAt: Timestamp.fromMillis(Date.now() + 30 * 1000),
                contestantCount: winners.length,
            });
        }
      }
    });
  } catch (e: any) {
    console.error(`Failed to process state for session ${sessionId}:`, e);
    try {
      await updateDoc(sessionRef, { status: 'finished', error: e.message, expiresAt: Timestamp.now() });
    } catch (updateError) {
      console.error(`Failed to mark session ${sessionId} as finished:`, updateError);
    }
  }
}

export async function startContestManually(sessionId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const sessionRef = doc(db, `contestSessions/${sessionId}`);
    const contestantsRef = collection(sessionRef, "contestants");

    try {
        const contestantsSnapshot = await getDocs(query(contestantsRef));

        await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists()) throw new Error("Session not found.");
            
            const session = sessionDoc.data()!;
            if (session.status !== 'waiting') throw new Error("The contest has already started.");
            if (session.hostId !== userId) throw new Error("Only the host can start the contest.");

            if (contestantsSnapshot.docs.length < 2) {
                throw new Error("You need at least 2 players to start the contest.");
            }
            
            transaction.update(sessionRef, {
                status: 'voting',
                expiresAt: Timestamp.fromMillis(Date.now() + 30 * 1000)
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
    const expiredQuery = query(contestRef,
        where("status", "!=", "finished"),
        where("expiresAt", "<=", now));

    try {
        const expiredSnapshot = await getDocs(expiredQuery);
        if (expiredSnapshot.empty) return;
        const promises = expiredSnapshot.docs.map(doc => processContestState(doc.id));
        await Promise.all(promises);

    } catch (e: any) {
        console.error("Error during contest cleanup:", e);
    }
}
