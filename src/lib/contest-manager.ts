
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
  runTransaction,
} from 'firebase/firestore';
import type { Plant } from '@/interfaces/plant';
import { v4 as uuidv4 } from 'uuid';

const MAX_PLAYERS = 1;

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
    const newPlayer: ContestPlayer = { uid: userId, username, avatarColor, plant: playerPlant };

    // 1. Check if the player is already in an active session
    const playerInSessionQuery = query(sessionsRef, where('status', 'in', ['waiting', 'countdown', 'voting']));
    const playerInSessionSnapshot = await getDocs(playerInSessionQuery);

    for (const docSnap of playerInSessionSnapshot.docs) {
        const session = docSnap.data() as ContestSession;
        if (session.players.some(p => p.uid === userId)) {
            return docSnap.id; // Return existing session ID
        }
    }

    // 2. Find an open session to join
    const openSessionQuery = query(sessionsRef, where('status', '==', 'waiting'), where('playerCount', '<', MAX_PLAYERS), limit(1));
    
    try {
        const sessionDocRef = await runTransaction(db, async (transaction) => {
            const openSessionSnapshot = await getDocs(openSessionQuery);
            if (openSessionSnapshot.empty) {
                return null; // No open session found, will proceed to create one.
            }

            const sessionDoc = openSessionSnapshot.docs[0];
            const currentSessionDocRef = doc(db, 'contestSessions', sessionDoc.id);
            const sfDoc = await transaction.get(currentSessionDocRef);

            if (!sfDoc.exists()) {
                throw new Error("Session no longer exists.");
            }
            
            const sessionData = sfDoc.data() as ContestSession;
            if (sessionData.players.some(p => p.uid === userId)) {
                return currentSessionDocRef; // Already in this session
            }

            const newPlayerCount = sessionData.playerCount + 1;
            const updates: any = {
                players: arrayUnion(newPlayer),
                playerCount: newPlayerCount,
            };

            if (newPlayerCount >= MAX_PLAYERS) {
                updates.status = 'countdown';
            }

            transaction.update(currentSessionDocRef, updates);
            return currentSessionDocRef;
        });

        if (sessionDocRef) {
            return sessionDocRef.id;
        }

    } catch (e) {
        console.error("Transaction failed, will attempt to create a new session.", e);
    }
    
    // 3. If no open sessions or transaction failed, create a new one
    const newSessionId = uuidv4();
    const newSession: ContestSession = {
      id: newSessionId,
      status: 'waiting',
      players: [newPlayer],
      votes: {},
      playerVotes: {},
      createdAt: serverTimestamp(),
      playerCount: 1,
    };

    if (newSession.playerCount >= MAX_PLAYERS) {
        newSession.status = 'countdown';
    }

    await setDoc(doc(db, 'contestSessions', newSessionId), newSession);
    return newSessionId;
}
