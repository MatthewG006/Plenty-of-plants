
'use server';

import { plantChat } from '@/ai/flows/plant-chat-flow';
import type { PlantChatInput } from '@/interfaces/chat';

export async function plantChatAction(input: PlantChatInput) {
  // We can't return the output of the flow directly to the client, as it's not serializable.
  const result = await plantChat(input);
  return {
    response: result.response,
  }
}
