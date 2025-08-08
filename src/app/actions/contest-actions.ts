
'use server';

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
  arrayUnion,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import type { Plant } from '@/interfaces/plant';
import { v4 as uuidv4 } from 'uuid';
import type { ContestPlayer, ContestSession } from '@/lib/contest-manager';

const MAX_PLAYERS = 3;

export async function findOrCreateContestSessionAction(
  userId: string,
  username: string,
  avatarColor: string,
  playerPlant: Plant
): Promise<string> {
  const sessionsRef = collection(db, 'contestSessions');

  // Transactionally find and join a session
  try {
    const sessionId = await runTransaction(db, async (transaction) => {
      // Query for sessions that are waiting for players
      const openSessionQuery = query(
        sessionsRef,
        where('status', '==', 'waiting'),
        where('playerCount', '<', MAX_PLAYERS),
        limit(1)
      );
      
      const openSessionsSnapshot = await transaction.get(openSessionQuery);

      if (!openSessionsSnapshot.empty) {
        // Found an open session, let's join it
        const sessionDoc = openSessionsSnapshot.docs[0];
        const sessionRef = sessionDoc.ref;
        
        // Ensure user is not already in this session to prevent duplicate joins
        const sessionData = sessionDoc.data() as ContestSession;
        if (sessionData.playerUids.includes(userId)) {
            // User is already in this session, return its ID
            return sessionRef.id;
        }

        const newPlayer: ContestPlayer = { uid: userId, username, avatarColor, plant: playerPlant };
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
      } else {
        // No open sessions found, return null to signal creation of a new one
        return null;
      }
    });

    if (sessionId) {
      return sessionId;
    }
  } catch (error) {
    console.error("Transaction to find/join session failed. Will create a new one.", error);
    // If transaction fails, we proceed to create a new session below.
  }

  // If no open session was found or the transaction failed, create a new session.
  const newSessionId = uuidv4();
  const newPlayer: ContestPlayer = { uid: userId, username, avatarColor, plant: playerPlant };
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
