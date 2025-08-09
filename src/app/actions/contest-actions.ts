
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
  limit,
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
    
    // First, check if the user is already in an active session to prevent duplicates
    const playerAlreadyInSessionQuery = query(sessionsRef, where('playerUids', 'array-contains', userId), where('status', '!=', 'finished'), limit(1));
    const existingSessionSnapshot = await getDocs(playerAlreadyInSessionQuery);
    
    if (!existingSessionSnapshot.empty) {
        // User is already in a session, return that session's ID.
        return existingSessionSnapshot.docs[0].id;
    }

    // Now, look for a session that is waiting for players.
    const waitingSessionsQuery = query(
        sessionsRef,
        where('status', '==', 'waiting'),
        limit(10) // Limit to check a reasonable number of sessions
    );

    const querySnapshot = await getDocs(waitingSessionsQuery);
    let suitableSessionId: string | null = null;

    // Find a suitable session that is not full.
    for (const doc of querySnapshot.docs) {
        const session = doc.data() as ContestSession;
        if (session.playerCount < MAX_PLAYERS) {
            suitableSessionId = doc.id;
            break;
        }
    }

    // If we found a suitable session, try to join it transactionally.
    if (suitableSessionId) {
        try {
            const sessionDocRef = doc(db, 'contestSessions', suitableSessionId);
            await runTransaction(db, async (transaction) => {
                const sessionDoc = await transaction.get(sessionDocRef);
                if (!sessionDoc.exists()) {
                    throw new Error("Session disappeared.");
                }
                const sessionData = sessionDoc.data() as ContestSession;

                // Final check inside the transaction to prevent race conditions
                if (sessionData.status === 'waiting' && sessionData.playerCount < MAX_PLAYERS) {
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
                    // Session filled up while we were trying to join, throw an error to signal we should try again or create a new one.
                    throw new Error("Session is no longer suitable.");
                }
            });
            // If the transaction succeeded, we have joined the session.
            return suitableSessionId;
        } catch (error: any) {
            console.warn(`Failed to join session ${suitableSessionId}, likely a race condition. A new session will be created.`, error.message);
            // Fall through to create a new session if joining failed.
        }
    }

    // If no suitable session was found OR joining failed, create a new one.
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
}
