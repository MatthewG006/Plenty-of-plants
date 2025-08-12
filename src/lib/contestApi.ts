// src/lib/contestApi.ts
import { db } from "./firebaseClient";
import {
  doc,
  collection,
  setDoc,
  serverTimestamp,
  runTransaction,
  updateDoc,
} from "firebase/firestore";

/**
 * Host creates a new contest session
 */
export async function createSession(hostId: string) {
  const sessionRef = doc(collection(db, "contestSessions"));
  await setDoc(sessionRef, {
    hostId,
    status: "lobby",
    createdAt: serverTimestamp(),
    round: 0,
  });
  return sessionRef.id;
}

/**
 * Join the contest as a participant
 */
export async function joinSession(
  sessionId: string,
  userId: string,
  plantId: string,
  displayName: string
) {
  const participantRef = doc(
    db,
    `contestSessions/${sessionId}/participants/${userId}`
  );
  await setDoc(participantRef, {
    userId,
    plantId,
    displayName,
    submittedAt: serverTimestamp(),
  });
}

/**
 * Cast a vote (only once per voter)
 */
export async function vote(
  sessionId: string,
  voterId: string,
  votedForParticipantId: string
) {
  const voteRef = doc(db, `contestSessions/${sessionId}/votes/${voterId}`);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(voteRef);
    if (snap.exists()) throw new Error("Already voted");
    tx.set(voteRef, {
      voterId,
      votedForParticipantId,
      votedAt: serverTimestamp(),
    });
  });
}

/**
 * Start the voting round (host only)
 */
export async function startVoting(sessionId: string) {
  const sessionRef = doc(db, `contestSessions/${sessionId}`);
  await updateDoc(sessionRef, {
    status: "voting",
    votingStartsAt: serverTimestamp(),
  });
}

/**
 * End the round (host only)
 */
export async function endVoting(sessionId: string) {
  const sessionRef = doc(db, `contestSessions/${sessionId}`);
  await updateDoc(sessionRef, {
    status: "ended",
    votingEndsAt: serverTimestamp(),
  });
}
