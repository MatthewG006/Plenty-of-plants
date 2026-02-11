
export type PlantId =
  | 'plant-pothos'
  | 'plant-snake'
  | 'plant-monstera'
  | 'plant-cactus'
  | 'plant-orchid'
  | 'plant-zz'
  | 'plant-fiddle-leaf'
  | 'plant-calathea';

export type CosmeticId =
  | 'plant-pot-brown'
  | 'plant-pot-green'
  | 'plant-pot-blue'
  | 'plant-pot-pink'
  | 'plant-pot-terracotta'
  | 'plant-pot-glitter'
  | 'plant-pot-sheen'
  | 'plant-pot-red-glitter'
  | 'plant-pot-rainbow-glitter';

export interface Plant {
  id: PlantId;
  lastWatered: Date;
  isThirsty: boolean;
  isDead: boolean;
  customImage: string | null;
  level: number;
  xp: number;
  showcased: boolean;
  hasBeenWatered: boolean;
  conversations: {
    sentAt: Date;
    message: string;
    response: string;
  }[];
  fertilizerApplied: boolean;
  cosmetic: CosmeticId;
  lastLove: Date;
}

export interface PlantArrangement {
  [key: string]: PlantId | null;
}

export interface User {
  email: string;
  uid: string;
  likes: number;
  showcasePlants: PlantId[];
  lastOnline: Date;
  createdAt: Date;
}

export interface Challenge {
  id: string;
  description: string;
  goal: number;
  reward: number;
}

export interface DailyChallenge extends Challenge {
  progress: number;
}

export interface GameData {
  gold: number;
  draws: number;
  lastDrawRefill: number;
  fertilizer: number;
  waterRefills: number;
  sprinklers: number;
  sheen: number;
  glitter: number;
  redGlitter: number;
  rainbowGlitter: number;
  loginRewards: {
    lastClaimed: number;
    streak: number;
  };
  ownedCosmetics: CosmeticId[];
  ownedPlants: PlantId[];
  plantChats: PlantId[];
  activeChallenges: DailyChallenge[];
  completedChallenges: string[];
  seasonalCurrency: number;
}
