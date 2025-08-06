
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

export interface ContestPlayer {
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
  playerVotes: Record<string, boolean>; // uid -> hasVoted
  winnerId?: number | null;
  createdAt: FieldValue;
  votingEndsAt?: FieldValue;
  playerCount: number;
}

// In a real, high-traffic application, this would be handled by a Cloud Function
// to avoid race conditions. For this project, a client-side implementation is sufficient.
export async function findOrCreateContestSession(
  userId: string,
  username: string,
  avatarColor: string,
  playerPlant: Plant
): Promise<string> {
  const sessionsRef = collection(db, 'contestSessions');

  // Query for an open session that isn't full and was created recently
  const q = query(
    sessionsRef,
    where('status', '==', 'waiting'),
    where('playerCount', '<', MAX_PLAYERS),
    limit(1)
  );

  const querySnapshot = await getDocs(q);
  
  const newPlayer: ContestPlayer = {
    uid: userId,
    username,
    avatarColor,
    plant: playerPlant,
  };

  if (!querySnapshot.empty) {
    const sessionDoc = querySnapshot.docs[0];
    const sessionData = sessionDoc.data() as ContestSession;
    
    // Prevent user from joining the same session twice
    if(sessionData.players.some((p: ContestPlayer) => p.uid === userId)) {
        return sessionDoc.id;
    }

    const sessionDocRef = doc(db, 'contestSessions', sessionDoc.id);
    const newPlayerCount = sessionData.playerCount + 1;

    const updates: any = {
      players: arrayUnion(newPlayer),
      playerCount: newPlayerCount,
    };
    
    // If the session is now full, update its status
    if (newPlayerCount >= MAX_PLAYERS) {
        updates.status = 'countdown';
    }

    await updateDoc(sessionDocRef, updates);
    return sessionDoc.id;

  } else {
    // Create new session
    const newSessionId = uuidv4();
    const newSession: Omit<ContestSession, 'id' | 'playerCount'> = {
      status: 'waiting',
      players: [newPlayer],
      votes: {},
      playerVotes: {},
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'contestSessions', newSessionId), {
        ...newSession,
        id: newSessionId,
        playerCount: 1,
    });
    return newSessionId;
  }
}

    