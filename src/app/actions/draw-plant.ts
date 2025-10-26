
'use server';

import { drawPlantFlow } from '@/ai/flows/draw-plant-flow';
import type { DrawPlantOutput } from '@/interfaces/plant';

/**
 * This server action serves as a wrapper around the client-side Genkit flow.
 * It ensures that we have a consistent server action interface for drawing plants,
 * even though the logic now executes on the client to leverage its auth context.
 */
export async function drawPlantAction(existingNames: string[] = []): Promise<DrawPlantOutput> {
  // Note: The actual implementation is in the Genkit flow which is now
  // configured to run on the client. This action simply invokes it.
  // The 'use client' directive within the flow's implementation handles this.
  try {
    const result = await drawPlantFlow(existingNames);
    return result;
  } catch (error: any) {
    console.error("Error in drawPlantAction:", error);
    // Re-throw the error to be caught by the client-side caller
    throw new Error(error.message || "An unexpected error occurred while drawing the plant.");
  }
}
