'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  runTransaction,
  Timestamp,
  deleteDoc,
  arrayUnion,
} from 'firebase/firestore';
import { ContestSession } from './contest-types';

/**
 * Create a new contest session
 */
function createNewSession(hostName: string): Omit<ContestSession, 'id'> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  return {
    status: 'waiting',
    createdAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
    round: 1,
    contestantCount: 0,
    hostName,
    winner: undefined, // keep optional for consistency
  };
}

/**
 * Create or join a contest
 */
export async function createOrJoinContest(userId: string, userName: string) {
  return runTransaction(db, async (transaction) => {
    const sessionRef = doc(collection(db, 'contestSessions'));

    // Check for existing waiting session
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      // Create new session
      const newSession = createNewSession(userName);
      transaction.set(sessionRef, newSession);
    }

    // Add contestant subdoc
    const contestantRef = doc(
      collection(sessionRef, 'contestants'),
      userId
    );

    transaction.set(contestantRef, {
      name: userName,
      votes: 0,
      isConnected: true,
      lastActive: Timestamp.now(),
    });

    // Update contestant count
    transaction.update(sessionRef, {
      contestantCount: (snapshot.data()?.contestantCount || 0) + 1,
    });

    return sessionRef.id;
  });
}

/**
 * Cast a vote for a contestant
 */
export async function voteForContestant(
  sessionId: string,
  voterId: string,
  targetContestantId: string
) {
  return runTransaction(db, async (transaction) => {
    const sessionRef = doc(db, 'contestSessions', sessionId);
    const sessionSnap = await transaction.get(sessionRef);

    if (!sessionSnap.exists()) throw new Error('Session not found');
    const session = sessionSnap.data() as ContestSession;

    if (session.status !== 'voting') throw new Error('Not in voting phase');
    if (voterId === targetContestantId) throw new Error('Cannot self-vote');

    // Check if voter already voted this round
    const roundVoters: string[] = session.roundVoterIds || [];
    if (roundVoters.includes(voterId)) {
      throw new Error('You already voted this round');
    }

    // Update target contestant’s vote
    const targetRef = doc(
      collection(sessionRef, 'contestants'),
      targetContestantId
    );
    const targetSnap = await transaction.get(targetRef);
    if (!targetSnap.exists()) throw new Error('Contestant not found');

    transaction.update(targetRef, { votes: targetSnap.data().votes + 1 });

    // Track that this voter has voted
    transaction.update(sessionRef, {
      roundVoterIds: arrayUnion(voterId),
    });
  });
}

/**
 * Process contest state (advance round or finish)
 */
export async function processContestState(sessionId: string) {
  return runTransaction(db, async (transaction) => {
    const sessionRef = doc(db, 'contestSessions', sessionId);
    const sessionSnap = await transaction.get(sessionRef);

    if (!sessionSnap.exists()) return;
    const session = sessionSnap.data() as ContestSession;

    const contestantsRef = collection(sessionRef, 'contestants');
    const contestantsSnap = await transaction.get(contestantsRef);
    const contestants = contestantsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as any[];

    // Check for inactivity
    const now = Timestamp.now();
    contestants.forEach((c) => {
      if (c.lastActive?.toMillis() < now.toMillis() - 60000) {
        const ref = doc(contestantsRef, c.id);
        transaction.update(ref, { isConnected: false });
      }
    });

    const activeContestants = contestants.filter((c) => c.isConnected);

    // If no active players -> end session
    if (activeContestants.length === 0) {
      transaction.update(sessionRef, { status: 'finished', winner: null });
      return;
    }

    // If only one remains -> declare winner
    if (activeContestants.length === 1) {
      transaction.update(sessionRef, {
        status: 'finished',
        winner: activeContestants[0].name,
      });
      return;
    }

    // Voting phase logic
    if (session.status === 'voting') {
      const highestVotes = Math.max(...activeContestants.map((c) => c.votes));
      const topContestants = activeContestants.filter(
        (c) => c.votes === highestVotes
      );

      if (highestVotes === 0) {
        // Nobody voted -> auto finish
        transaction.update(sessionRef, {
          status: 'finished',
          winner: null,
        });
        return;
      }

      if (topContestants.length === 1) {
        // Eliminate all others
        activeContestants.forEach((c) => {
          if (c.id !== topContestants[0].id) {
            const ref = doc(contestantsRef, c.id);
            transaction.update(ref, { isConnected: false });
          }
        });
      }

      // Reset votes and voterIds
      activeContestants.forEach((c) => {
        const ref = doc(contestantsRef, c.id);
        transaction.update(ref, { votes: 0 });
      });
      transaction.update(sessionRef, {
        round: session.round + 1,
        roundVoterIds: [],
      });
    }
  });
}

/**
 * Cleanup expired contests
 * - instead of deleting, mark them finished so you can show "past contests"
 */
export async function cleanupExpiredContests() {
  const sessionsRef = collection(db, 'contestSessions');
  const snapshot = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(sessionsRef);
    snap.docs.forEach((docSnap) => {
      const session = docSnap.data() as ContestSession;
      if (
        session.expiresAt &&
        session.expiresAt.toMillis() < Date.now()
      ) {
        transaction.update(docSnap.ref, { status: 'finished' });
      }
    });
  });
}
