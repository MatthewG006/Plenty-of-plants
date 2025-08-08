
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
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

  try {
    const sessionId = await runTransaction(db, async (transaction) => {
      // Step 1: Query for sessions that are waiting and not full.
      // This is a more direct query but may require a composite index in Firestore.
      // If permission errors occur, the rules need to allow this.
      const waitingSessionsQuery = query(
        sessionsRef,
        where('status', '==', 'waiting')
      );
      
      const querySnapshot = await transaction.get(waitingSessionsQuery);
      
      let suitableSessionRef = null;
      
      // Step 2: Iterate to find a session that is not full and the user is not already in.
      for (const doc of querySnapshot.docs) {
        const session = doc.data() as ContestSession;
        if (session.playerCount < MAX_PLAYERS && !session.playerUids.includes(userId)) {
          suitableSessionRef = doc.ref;
          break;
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

        // If the session is now full, start the countdown.
        if (newPlayerCount >= MAX_PLAYERS) {
          updates.status = 'countdown';
        }

        transaction.update(suitableSessionRef, updates);
        return suitableSessionRef.id;
      }

      // Step 4: If no suitable session is found, create a new one.
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
