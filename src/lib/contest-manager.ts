
'use client';

import { db } from './firebase';
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
  FieldValue,
  arrayUnion,
  updateDoc,
} from 'firebase/firestore';
import type { Plant } from '@/interfaces/plant';
import { v4 as uuidv4 } from 'uuid';

const MAX_PLAYERS = 3;

interface ContestPlayer {
  uid: string;
  username: string;
  avatarColor: string;
  plant: Plant;
}

export interface ContestSession {
  id: string;
  status: 'waiting' | 'countdown' | 'voting' | 'finished';
  players: ContestPlayer[];
  votes: Record<string, number>; // plant.id -> vote count
  winnerId?: number | null;
  createdAt: FieldValue;
  votingEndsAt?: FieldValue;
}

// In a real, high-traffic application, this would be handled by a Cloud Function
// to avoid race conditions. For this project, a client-side implementation is sufficient.
export async function findOrCreateContestSession(
  userId: string,
  username: string,
  avatarColor: string,
  playerPlant: Plant
): Promise<ContestSession> {
  const sessionsRef = collection(db, 'contestSessions');

  // Query for an open session that isn't full and was created recently
  const q = query(
    sessionsRef,
    where('status', '==', 'waiting'),
    where('playerCount', '<', MAX_PLAYERS),
    limit(1)
  );

  const querySnapshot = await getDocs(q);
  let sessionToJoin: ContestSession | null = null;
  let sessionId: string | null = null;

  if (!querySnapshot.empty) {
    const sessionDoc = querySnapshot.docs[0];
    sessionToJoin = sessionDoc.data() as ContestSession;
    sessionId = sessionDoc.id;
  }

  const newPlayer: ContestPlayer = {
    uid: userId,
    username,
    avatarColor,
    plant: playerPlant,
  };

  if (sessionToJoin && sessionId) {
    // Join existing session
    const sessionDocRef = doc(db, 'contestSessions', sessionId);
    await updateDoc(sessionDocRef, {
      players: arrayUnion(newPlayer),
      playerCount: (sessionToJoin.players.length || 0) + 1,
    });
    return { ...sessionToJoin, players: [...sessionToJoin.players, newPlayer] };
  } else {
    // Create new session
    const newSessionId = uuidv4();
    const newSession: ContestSession = {
      id: newSessionId,
      status: 'waiting',
      players: [newPlayer],
      votes: {},
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'contestSessions', newSessionId), {
        ...newSession,
        playerCount: 1, // Add playerCount for querying
    });
    return newSession;
  }
}
