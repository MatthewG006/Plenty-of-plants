
'use client';

import { db } from '@/lib/firebase';
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
  playerUids: string[];
  votes: Record<string, number>; // plant.id -> vote count
  playerVotes: Record<string, boolean>; // uid -> hasVoted
  winnerId?: number | null;
  createdAt: FieldValue;
  playerCount: number;
}


// In a real, high-traffic application, this would be handled by a Cloud Function
// to avoid race conditions. For this project, a client-side transaction is sufficient.
export async function findOrCreateContestSession(
  userId: string,
  username: string,
  avatarColor: string,
  playerPlant: Plant
): Promise<string> {
    const sessionsRef = collection(db, 'contestSessions');
    const newPlayer: ContestPlayer = { uid: userId, username, avatarColor, plant: playerPlant };

    // 1. Check if the player is already in an active session to allow re-joining.
    const playerInSessionQuery = query(
        sessionsRef, 
        where('status', 'in', ['waiting', 'countdown', 'voting']),
        where('playerUids', 'array-contains', userId),
        limit(1)
    );

    const playerInSessionSnapshot = await getDocs(playerInSessionQuery);
    if (!playerInSessionSnapshot.empty) {
        return playerInSessionSnapshot.docs[0].id; // Player is already in a session, return it.
    }

    // 2. Find an open session to join using a transaction to prevent race conditions.
    const openSessionQuery = query(sessionsRef, where('status', '==', 'waiting'));
    
    try {
        const sessionId = await runTransaction(db, async (transaction) => {
            const openSessionsSnapshot = await transaction.get(openSessionQuery);
            
            // Find the first session that is ACTUALLY not full
            const availableSessionDoc = openSessionsSnapshot.docs.find(doc => doc.data().playerCount < MAX_PLAYERS);

            if (!availableSessionDoc) {
                return null; // No open sessions, will create a new one.
            }
            
            const sessionRef = doc(db, 'contestSessions', availableSessionDoc.id);
            const sessionData = availableSessionDoc.data();

            if (sessionData.playerCount >= MAX_PLAYERS) {
                // Session filled up between query and transaction start
                throw new Error("Session is no longer available.");
            }
            
            const newPlayerCount = sessionData.playerCount + 1;
            const updates: any = {
                players: arrayUnion(newPlayer),
                playerUids: arrayUnion(userId),
                playerCount: newPlayerCount,
            };

            if (newPlayerCount >= MAX_PLAYERS) {
                updates.status = 'countdown';
            }
            
            transaction.update(sessionRef, updates);
            return sessionRef.id;
        });

        if (sessionId) {
            return sessionId;
        }

    } catch (error) {
        console.error("Transaction to join session failed. Will create a new one.", error);
    }
    
    // 3. If no open sessions or transaction failed, create a new one
    const newSessionId = uuidv4();
    const newSession: ContestSession = {
      id: newSessionId,
      status: 'waiting',
      players: [newPlayer],
      playerUids: [userId],
      votes: {},
      playerVotes: {},
      createdAt: serverTimestamp(),
      playerCount: 1,
    };

    await setDoc(doc(db, 'contestSessions', newSessionId), newSession);
    return newSessionId;
}
