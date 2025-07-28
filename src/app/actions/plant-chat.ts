
'use server';

import { plantChat, type PlantChatInput, type PlantChatOutput } from '@/ai/flows/plant-chat-flow';

export async function plantChatAction(input: PlantChatInput): Promise<PlantChatOutput> {
  return await plantChat(input);
}
