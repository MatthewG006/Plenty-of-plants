
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

  // 1. Check if the player is already in an active session to allow re-joining.
  const playerInSessionQuery = query(
    sessionsRef,
    where('status', 'in', ['waiting', 'countdown', 'voting']),
    where('playerUids', 'array-contains', userId),
    limit(1)
  );

  const playerInSessionSnapshot = await getDocs(playerInSessionQuery);
  if (!playerInSessionSnapshot.empty) {
    return playerInSessionSnapshot.docs[0].id;
  }

  // 2. Find an open session to join using a transaction.
  const openSessionQuery = query(sessionsRef, where('status', '==', 'waiting'), where('playerCount', '<', MAX_PLAYERS));

  try {
    const sessionId = await runTransaction(db, async (transaction) => {
      const openSessionsSnapshot = await transaction.get(openSessionQuery);

      if (openSessionsSnapshot.empty) {
        return null; // No open sessions, will create a new one.
      }

      const availableSessionDoc = openSessionsSnapshot.docs[0];
      const sessionRef = doc(db, 'contestSessions', availableSessionDoc.id);

      const newPlayer: ContestPlayer = { uid: userId, username, avatarColor, plant: playerPlant };
      
      const newPlayerCount = availableSessionDoc.data().playerCount + 1;
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

  // 3. If no open sessions or transaction failed, create a new one.
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
