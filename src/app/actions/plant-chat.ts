
'use server';

import { plantChat, type PlantChatInput } from '@/ai/flows/plant-chat-flow';

export async function plantChatAction(input: PlantChatInput) {
  // We can't return the output of the flow directly to the client, as it's not serializable.
  const result = await plantChat(input);
  return {
    response: result.response,
  }
}
