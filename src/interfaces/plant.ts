
import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

export interface Plant {
  id: number;
  name: string;
  form: string;
  image: string;
  baseImage: string;
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
export interface Contestant extends Omit<Plant, 'id' | 'lastWatered' | 'conversationHistory'> {
    id: string; // The document ID in the subcollection.
    votes: number;
    voterIds: string[];
    ownerId: string; // The UID of the user who owns this plant.
    ownerName: string; // The display name of the user.
    lastSeen: Timestamp;
}

export interface ContestSession {
    id: string;
    status: 'waiting' | 'voting' | 'finished';
    createdAt: Timestamp | string;
    expiresAt: Timestamp | string;
    round: number;
    contestantCount: number;
    hostId: string;
    hostName: string;
    winner?: Contestant;
}


// Schemas for AI Flows

export const GetPlantDetailsInputSchema = z.object({
  existingNames: z.array(z.string()).describe('An array of plant names that already exist in the user\'s collection to avoid duplication.'),
});
export type GetPlantDetailsInput = z.infer<typeof GetPlantDetailsInputSchema>;

export const GetPlantDetailsOutputSchema = z.object({
  name: z.string().describe('The creative and unique name of the plant, avoiding common plant names.'),
  description: z.string().describe('A short, one-sentence, whimsical description of the plant.'),
});
export type GetPlantDetailsOutput = z.infer<typeof GetPlantDetailsOutputSchema>;


export const DrawPlantOutputSchema = z.object({
  name: z.string().describe('The creative and unique name of the plant, avoiding common plant names.'),
  description: z.string().describe('A short, one-sentence, whimsical description of the plant.'),
  imageDataUri: z
    .string()
    .describe(
      "The image of the plant, as a data URI."
    ),
  hint: z.string().optional(),
});

export type DrawPlantOutput = z.infer<typeof DrawPlantOutputSchema>;

export const EvolvePlantInputSchema = z.object({
  name: z.string().describe('The name of the plant being evolved.'),
  baseImageDataUri: z
    .string()
    .describe(
      "The UNCOMPRESSED, high-quality image of the plant's current form, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  form: z.string().describe('The current form of the plant (e.g., "Base", "Evolved").'),
});
export type EvolvePlantInput = z.infer<typeof EvolvePlantInputSchema>;

export const EvolvePlantOutputSchema = z.object({
  newImageDataUri: z
    .string()
    .describe(
      "The newly generated, evolved image of the plant, as a data URI."
    ),
  personality: z.string().optional().describe("A one-word personality trait for the plant (e.g., 'cheerful', 'grumpy'). This is only generated for the final form."),
});
export type EvolvePlantOutput = z.infer<typeof EvolvePlantOutputSchema>;
