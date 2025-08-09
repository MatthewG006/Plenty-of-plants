
'use client';

import type { Plant } from '@/interfaces/plant';
import type { FieldValue } from 'firebase/firestore';

export interface ContestPlayer {
  uid: string;
  username: string;
  avatarColor: string;
  plant: Plant;
}

export interface ContestSession {
  id: string;
  status: 'voting' | 'finished';
  // Using a map of players for easier lookup and update
  players: Record<string, ContestPlayer>; // key is player uid
  // Using a map of votes for easier lookup
  votes: Record<string, string>; // key is voter's uid, value is the uid of the player they voted for
  winnerId?: string | null;
  createdAt: FieldValue;
  endsAt: string; // ISO string for dates
  duration: number; // in milliseconds
}
