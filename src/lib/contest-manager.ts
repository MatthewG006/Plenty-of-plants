
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
    const newPlayer: ContestPlayer = { uid: userId, username, avatarColor, plant: playerPlant };

    // 1. Check if the player is already in an active session
    const playerInSessionQuery = query(sessionsRef, where('players', 'array-contains', newPlayer.uid), where('status', 'in', ['waiting', 'countdown']));
    const playerInSessionSnapshot = await getDocs(playerInSessionQuery);

    if (!playerInSessionSnapshot.empty) {
        // The user is already in a session, just return that session ID
        return playerInSessionSnapshot.docs[0].id;
    }

    // 2. Find an open session to join
    const openSessionQuery = query(sessionsRef, where('status', '==', 'waiting'), where('playerCount', '<', MAX_PLAYERS));
    const openSessionSnapshot = await getDocs(openSessionQuery);

    if (!openSessionSnapshot.empty) {
        const sessionDoc = openSessionSnapshot.docs[0];
        const sessionDocRef = doc(db, 'contestSessions', sessionDoc.id);

        try {
            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(sessionDocRef);
                if (!sfDoc.exists()) {
                    throw "Session no longer exists.";
                }

                const sessionData = sfDoc.data() as ContestSession;
                if (sessionData.players.some(p => p.uid === userId)) {
                    // This case is unlikely due to the initial check, but good for safety
                    return; 
                }

                const newPlayerCount = sessionData.playerCount + 1;
                const updates: any = {
                    players: arrayUnion(newPlayer),
                    playerCount: newPlayerCount,
                };

                if (newPlayerCount >= MAX_PLAYERS) {
                    updates.status = 'countdown';
                }

                transaction.update(sessionDocRef, updates);
            });
            return sessionDoc.id;
        } catch (e) {
            console.error("Transaction failed: ", e);
            // If transaction fails, we'll proceed to create a new session.
        }
    }
    
    // 3. If no open sessions, create a new one
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
    await setDoc(doc(db, 'contestSessions', newSessionId), newSession);
    return newSessionId;
}