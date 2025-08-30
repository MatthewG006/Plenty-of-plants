

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

