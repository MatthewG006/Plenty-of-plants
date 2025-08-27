
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, getDoc, writeBatch, updateDoc } from 'firebase/firestore';
import type { Plant, ContestSession, Contestant } from '@/lib/firestore';
import { awardContestPrize } from '@/lib/firestore';

const CONTEST_SESSION_ID = 'active'; // There is only one contest session at a time
const WAITING_TIME_SEC = 30;
const VOTE_TIME_SEC = 20;
const PLAYER_TIMEOUT_SEC = 15; // A player is considered disconnected after this many seconds of inactivity

// Helper to create a new, empty contest session
function createNewSession(plant: Contestant): ContestSession {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + WAITING_TIME_SEC * 1000);
    return {
        id: CONTEST_SESSION_ID,
        status: 'waiting',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        round: 1,
        contestants: [plant],
    };
}

export async function finalizeContest(): Promise<ContestSession | null> {
    // This function checks if the current contest has expired and finalizes the results if it has.
    // It creates a "reference" to the specific document in Firestore that holds the contest state.
    // Think of this as getting a direct pointer to the 'active' contest document in the 'contestSessions' collection.
    const sessionRef = doc(db, "contestSessions", CONTEST_SESSION_ID);
    try {
        // A "transaction" is used to safely read and write data. This prevents race conditions
        // where multiple players might try to update the contest at the same time.
        const session = await runTransaction(db, async (transaction) => {
            const liveSessionDoc = await transaction.get(sessionRef);
            if (!liveSessionDoc.exists()) return null;

            let sessionData = liveSessionDoc.data() as ContestSession;
            const now = new Date();
            const expires = new Date(sessionData.expiresAt);

            // Check if the session's time has run out.
            if (now > expires) {
                 if (sessionData.status === 'waiting') {
                    // If no one joined, just delete the session.
                    transaction.delete(sessionRef);
                    return null;
                } else if (sessionData.status === 'voting') {
                    // --- HANDLE WINNER LOGIC ---
                    // If voting ended, determine the winner by finding the contestant with the most votes.
                    let maxVotes = -1;
                    let winners: Contestant[] = [];
                    sessionData.contestants.forEach(c => {
                        if (c.votes > maxVotes) {
                            maxVotes = c.votes;
                            winners = [c];
                        } else if (c.votes === maxVotes) {
                            winners.push(c);
                        }
                    });

                    if (winners.length <= 1) { // A single winner was found.
                        sessionData.status = 'finished';
                        sessionData.winner = winners[0];
                        if (sessionData.winner) {
                           // Award the prize to the winner's user document.
                           await awardContestPrize(sessionData.winner.ownerId);
                        }
                    } else { // It's a tie, so start a new round with the tied players.
                        sessionData.status = 'voting';
                        sessionData.round += 1;
                        sessionData.contestants = winners.map(c => ({...c, votes: 0, voterIds: [] }));
                        const newExpiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                        sessionData.expiresAt = newExpiresAt.toISOString();
                    }
                    // Save the updated session data back to the same document in Firestore.
                    transaction.set(sessionRef, sessionData);
                    return sessionData;
                }
            }
            // If the session hasn't expired, just return the current data.
            return sessionData;
        });
        return session;
    } catch (e) {
        console.error("Failed to finalize contest:", e);
        return null;
    }
}


export async function joinAndGetContestState({ userId, username, plant }: { userId: string, username: string, plant?: Plant }): Promise<{ session?: ContestSession | null, error?: string }> {
    try {
        // This gets a reference to the single 'active' contest document.
        const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);

        // This transaction safely handles creating a session if one doesn't exist,
        // or adding a player to the existing one.
        const finalSession = await runTransaction(db, async (transaction) => {
            const liveSessionDoc = await transaction.get(sessionRef);
            let session: ContestSession | null = liveSessionDoc.exists() ? liveSessionDoc.data() as ContestSession : null;
            
            // --- Player Timeout Cleanup ---
            // Before making changes, check for and remove any inactive players.
            if (session && session.status === 'waiting') {
                const now = new Date();
                const activeContestants = session.contestants.filter(c => {
                    const lastSeen = new Date(c.lastSeen);
                    return (now.getTime() - lastSeen.getTime()) < (PLAYER_TIMEOUT_SEC * 1000);
                });

                // If players were removed and the lobby is now empty, end the contest.
                if (activeContestants.length === 0) {
                    transaction.delete(sessionRef);
                    return null;
                }
                session.contestants = activeContestants;
            }
            // --- End Cleanup ---

            // This logic handles a player entering the contest with a plant.
            if (plant) { 
                const newContestant: Contestant = {
                    ...plant,
                    votes: 0,
                    voterIds: [],
                    ownerId: userId,
                    ownerName: username,
                    lastSeen: new Date().toISOString(), // Set initial timestamp
                };
                if (!session) { // If no contest is active, create a new one with this player.
                    session = createNewSession(newContestant);
                } else if (session.status === 'waiting') { // If the contest is waiting for players, add them.
                    const alreadyExists = session.contestants.some(c => c.ownerId === userId);
                    if (!alreadyExists) {
                        session.contestants.push(newContestant);
                    }
                }
                
                // If there are now enough players, automatically start the voting round.
                if (session && session.status === 'waiting' && session.contestants.length >= 3) {
                    session.status = 'voting';
                    const now = new Date();
                    const expiresAt = new Date(now.getTime() + VOTE_TIME_SEC * 1000);
                    session.expiresAt = expiresAt.toISOString();
                }
            }

            if (session) {
                // This command writes the new session state back to the Firestore document.
                transaction.set(sessionRef, session);
            }

            return session;
        });

        return { session: finalSession };

    } catch (e: any) {
        console.error("Contest transaction failed: ", e);
        if (e.code === 'permission-denied') {
             return { error: 'Missing or insufficient permissions. Please check your Firestore security rules as per the documentation.' };
        }
        return { error: e.message || 'Failed to communicate with contest service.' };
    }
}


export async function voteForContestant(userId: string, plantId: number): Promise<{ success: boolean; error?: string }> {
    try {
        // --- HANDLE VOTE LOGIC ---
        // This transaction ensures that a user can only vote once per round and that their vote is counted correctly.
        await runTransaction(db, async (transaction) => {
            const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);
            const sessionDoc = await transaction.get(sessionRef);

            if (!sessionDoc.exists()) {
                throw new Error("No active contest to vote in.");
            }

            const session = sessionDoc.data() as ContestSession;

            if (session.status !== 'voting') {
                throw new Error("Voting is not active.");
            }
            // Check if the user has already voted in this round.
            if (session.contestants.some(c => c.voterIds?.includes(userId))) {
                throw new Error("You have already voted in this round.");
            }

            const contestantIndex = session.contestants.findIndex(c => c.id === plantId);
            if (contestantIndex === -1) {
                throw new Error("This plant is not in the current contest round.");
            }

            const contestant = session.contestants[contestantIndex];
            if (contestant.ownerId === userId) {
                throw new Error("You cannot vote for your own plant.");
            }

            // Increment the vote count and record that this user has voted.
            session.contestants[contestantIndex].votes += 1;
            if (!session.contestants[contestantIndex].voterIds) {
                session.contestants[contestantIndex].voterIds = [];
            }
            session.contestants[contestantIndex].voterIds.push(userId);
            
            // Save the changes back to Firestore.
            transaction.set(sessionRef, session);
        });

        return { success: true };
    } catch (e: any) {
        console.error("Vote transaction failed: ", e);
        return { success: false, error: e.message || 'Failed to cast vote.' };
    }
}


export async function sendHeartbeat(userId: string) {
    // This is an optimized write that only updates the `lastSeen` field
    // for a specific user without needing a full transaction.
    const sessionRef = doc(db, 'contestSessions', CONTEST_SESSION_ID);

    // We still need to read the document first to find the correct contestant in the array.
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) return;

    const sessionData = sessionDoc.data() as ContestSession;
    if (sessionData.status !== 'waiting') return;

    const contestantIndex = sessionData.contestants.findIndex(c => c.ownerId === userId);
    if (contestantIndex !== -1) {
        // Using dot notation to update a specific field in an array element
        await updateDoc(sessionRef, {
            [`contestants.${contestantIndex}.lastSeen`]: new Date().toISOString()
        });
    }
}

