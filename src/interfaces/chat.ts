
import { z } from 'zod';

const ConversationTurnSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

export const PlantChatInputSchema = z.object({
  plantName: z.string().describe("The name of the plant."),
  plantPersonality: z.string().describe("The plant's personality trait."),
  userMessage: z.string().describe("The user's message to the plant."),
  history: z.array(ConversationTurnSchema).optional().describe("The previous conversation history."),
  form: z.string().describe("The current form of the plant (e.g., 'Base', 'Evolved', 'Final')."),
});
export type PlantChatInput = z.infer<typeof PlantChatInputSchema>;
