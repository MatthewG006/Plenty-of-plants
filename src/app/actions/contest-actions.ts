
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  doc,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  getDocs,
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

  try {
    const sessionId = await runTransaction(db, async (transaction) => {
      // Step 1: Query for sessions that are currently waiting for players.
      // This is a simple query on one field, which does not require a composite index.
      const waitingSessionsQuery = query(
        sessionsRef,
        where('status', '==', 'waiting')
      );
      
      const querySnapshot = await transaction.get(waitingSessionsQuery);
      
      let suitableSessionRef = null;
      
      // Step 2: Iterate through the waiting sessions to find one that is not full
      // and that the current user is not already a part of.
      for (const doc of querySnapshot.docs) {
        const session = doc.data() as ContestSession;
        if (session.playerCount < MAX_PLAYERS && !session.playerUids.includes(userId)) {
          suitableSessionRef = doc.ref;
          break; // Found a suitable session, exit the loop.
        }
      }

      // Step 3: If a suitable session is found, join it.
      if (suitableSessionRef) {
        const sessionData = (await transaction.get(suitableSessionRef)).data() as ContestSession;
        const newPlayer: ContestPlayer = { uid: userId, username, avatarColor, plant: playerPlant };
        const newPlayerCount = sessionData.playerCount + 1;

        const updates: any = {
          players: arrayUnion(newPlayer),
          playerUids: arrayUnion(userId),
          playerCount: newPlayerCount,
        };

        // If joining makes the session full, start the countdown.
        if (newPlayerCount >= MAX_PLAYERS) {
          updates.status = 'countdown';
        }

        transaction.update(suitableSessionRef, updates);
        return suitableSessionRef.id;
      }

      // Step 4: If no suitable session is found after checking all waiting ones, create a new session.
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
      
      const newSessionRef = doc(db, 'contestSessions', newSessionId);
      transaction.set(newSessionRef, newSession);
      return newSessionId;
    });

    return sessionId;

  } catch (error) {
    console.error("Error in findOrCreateContestSession transaction: ", error);
    throw new Error("Failed to find or create a contest session.");
  }
}
