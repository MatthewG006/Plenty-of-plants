
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
  status: 'waiting' | 'countdown' | 'voting' | 'finished';
  players: ContestPlayer[];
  playerUids: string[];
  votes: Record<string, number>; // plant.id -> vote count
  playerVotes: Record<string, boolean>; // uid -> hasVoted
  winnerId?: number | null;
  createdAt: FieldValue;
  playerCount: number;
}
