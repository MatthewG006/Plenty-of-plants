


export interface Plant {
  id: number;
  name: string;
  form: string;
  image: string;
  baseImage: string;
  uncompressedImage: string;
  hint: string;
  description: string;
  level: number;
  xp: number;
  lastWatered: number[];
  hasGlitter: boolean;
  hasSheen: boolean;
  hasRainbowGlitter: boolean;
  hasRedGlitter: boolean;
  personality: string;
  chatEnabled: boolean;
  conversationHistory: { role: 'user' | 'model', content: string }[];
}

export interface Seed {
  id: string;
  startTime: number;
}

export interface CommunityUser {
    uid: string;
    username: string;
    avatarColor: string;
    showcasePlants: Plant[];
    likes: number;
    gold: number;
}

// The Contestant interface combines a player's plant with information about who owns it.
// This is done so the contest document has a self-contained copy of all necessary data,
// which prevents the need for extra database lookups.
export interface Contestant extends Plant {
    votes: number;
    voterIds: string[];
    ownerId: string; // The UID of the user who owns this plant.
    ownerName: string; // The display name of the user.
    lastSeen: string; // ISO string
}

export interface ContestSession {
    id: string;
    status: 'waiting' | 'voting' | 'finished';
    createdAt: string; // ISO string
    expiresAt: string; // ISO string
    round: number;
    contestants: Contestant[];
    winner?: Contestant;
}


