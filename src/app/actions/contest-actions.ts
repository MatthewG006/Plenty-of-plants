
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
      // Step 1: Query for waiting sessions (simple query, no index needed)
      const waitingSessionsQuery = query(
        sessionsRef,
        where('status', '==', 'waiting')
      );
      const waitingSessionsSnapshot = await transaction.get(waitingSessionsQuery);

      let sessionToJoinRef = null;

      // Step 2: Find a session that isn't full
      for (const sessionDoc of waitingSessionsSnapshot.docs) {
        const sessionData = sessionDoc.data() as ContestSession;
        if (sessionData.playerCount < MAX_PLAYERS) {
          // Found a spot, make sure we're not already in it
          if (!sessionData.playerUids.includes(userId)) {
              sessionToJoinRef = sessionDoc.ref;
              break;
          } else {
              // User is already in this session, so just return its ID.
              return sessionDoc.id;
          }
        }
      }

      // Step 3: If we found a session, join it.
      if (sessionToJoinRef) {
        const sessionData = (await transaction.get(sessionToJoinRef)).data() as ContestSession;
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

        transaction.update(sessionToJoinRef, updates);
        return sessionToJoinRef.id;
      } 
      
      // Step 4: If no session was found, create a new one.
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
