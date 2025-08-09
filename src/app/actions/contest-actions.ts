
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
  setDoc,
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
    // Step 1: Query for sessions that are currently waiting for players.
    const waitingSessionsQuery = query(
      sessionsRef,
      where('status', '==', 'waiting')
    );
    
    const querySnapshot = await getDocs(waitingSessionsQuery);
    
    let suitableSessionId: string | null = null;
    
    // Step 2: Iterate through the waiting sessions to find one that is not full
    // and that the current user is not already a part of.
    for (const doc of querySnapshot.docs) {
      const session = doc.data() as ContestSession;
      if (session.playerCount < MAX_PLAYERS && !session.playerUids.includes(userId)) {
        suitableSessionId = doc.id;
        break; // Found a suitable session, exit the loop.
      }
    }

    // Step 3: If a suitable session is found, try to join it within a transaction.
    if (suitableSessionId) {
      const sessionDocRef = doc(db, 'contestSessions', suitableSessionId);
      try {
        await runTransaction(db, async (transaction) => {
          const sessionDoc = await transaction.get(sessionDocRef);
          if (!sessionDoc.exists()) {
            throw new Error("Session does not exist.");
          }
          const sessionData = sessionDoc.data() as ContestSession;
          
          // Double-check conditions within the transaction to prevent race conditions
          if (sessionData.status === 'waiting' && sessionData.playerCount < MAX_PLAYERS && !sessionData.playerUids.includes(userId)) {
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
            transaction.update(sessionDocRef, updates);
          } else {
             // If the session filled up before we could join, we'll let the logic fall through to create a new session.
             throw new Error("Session is no longer suitable.");
          }
        });
        return suitableSessionId; // Successfully joined the session.
      } catch (e) {
        // This catch block handles the transaction failure (e.g., race condition where session filled up).
        // We will now proceed to create a new session.
        console.log("Transaction to join session failed, creating a new one.", e);
      }
    }

    // Step 4: If no suitable session was found OR joining failed, create a new session.
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
    await setDoc(newSessionRef, newSession);
    return newSessionId;

  } catch (error) {
    console.error("Error in findOrCreateContestSessionAction: ", error);
    throw new Error("Failed to find or create a contest session.");
  }
}
