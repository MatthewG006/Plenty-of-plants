
'use client';

import type { Plant } from '@/interfaces/plant';

export interface ContestPlayer {
  uid: string;
  username: string;
  avatarColor: string;
  plant: Plant;
}

export interface ContestSession {
  id: string;
  status: 'voting' | 'finished';
  players: Record<string, ContestPlayer>; // key is player uid
  votes: Record<string, string>; // key is voter's uid, value is the uid of the player they voted for
  winnerId?: string | null;
  createdAt: string; // ISO string for dates
  endsAt: string; // ISO string for dates
  duration: number; // in milliseconds
}
