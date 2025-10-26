
'use server';
/**
 * @fileOverview A flow for drawing a new plant from the fallback collection.
 *
 * - drawPlant - A function that gets a new plant from storage.
 * - DrawPlantOutput - The return type for the drawPlant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getFallbackPlantFlow } from './get-fallback-plant-flow';

// The input schema is no longer used but is kept for consistency.
const DrawPlantInputSchema = z.object({
  existingNames: z.array(z.string()).optional().describe("A list of existing plant names to avoid duplicating."),
});

const DrawPlantOutputSchema = z.object({
  name: z.string().describe('The creative name of the plant.'),
  description: z.string().describe('A short, whimsical description of the plant.'),
  imageDataUri: z
    .string()
    .describe(
      "A generated image of the plant, as a data URI."
    ),
});
export type DrawPlantOutput = z.infer<typeof DrawPlantOutputSchema>;

// This function now just wraps the main flow.
export async function drawPlant(existingNames: string[] = []): Promise<DrawPlantOutput> {
  return drawPlantFlow({ existingNames });
}

// The main draw flow now directly calls the fallback flow,
// bypassing the more complex and error-prone AI generation.
const drawPlantFlow = ai.defineFlow(
  {
    name: 'drawPlantFlow',
    inputSchema: DrawPlantInputSchema,
    outputSchema: DrawPlantOutputSchema,
  },
  async () => {
    // Directly call the fallback flow to get a plant from Firebase Storage.
    return getFallbackPlantFlow();
  }
);
