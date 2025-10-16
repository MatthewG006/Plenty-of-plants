
'use server';

// import { plantChat } from '@/ai/flows/plant-chat-flow';
import type { PlantChatInput } from '@/interfaces/chat';

// export async function plantChatAction(input: PlantChatInput) {
//   // We can't return the output of the flow directly to the client, as it's not serializable.
//   const result = await plantChat(input);
//   return {
//     response: result.response,
//   }
// }

// TODO: This is a temporary measure to allow the app to build.
// The AI features need to be re-implemented.
export async function plantChatAction(input: PlantChatInput) {
  console.error("plantChatAction is temporarily disabled.");
  return Promise.reject(new Error("AI features are temporarily disabled."));
}
