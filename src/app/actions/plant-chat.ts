'use server';

// This is a dummy implementation to avoid the build error caused by genkit.
// We can restore this later.

import type { PlantChatInput, PlantChatOutput } from '@/interfaces/plant';

export async function plantChatAction(input: PlantChatInput): Promise<PlantChatOutput> {
  console.log('Dummy plantChatAction called with:', input);
  // Just return a canned response.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        response: "I'm just a little sprout right now, I can't talk yet!",
      });
    }, 500);
  });
}
