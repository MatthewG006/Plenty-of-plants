
'use server';

import { getFallbackPlantFlow, type GetFallbackPlantOutput } from '@/ai/flows/get-fallback-plant-flow';
import { DrawPlantOutputSchema } from '@/interfaces/plant';

/**
 * This server action is a simple wrapper around the `getFallbackPlantFlow`.
 * Its purpose is to provide a clean interface for the client to request a new plant,
 * ensuring that the plant comes directly from the curated list in Firebase Storage.
 */
export async function drawPlantAction(existingNames: string[] = []): Promise<GetFallbackPlantOutput> {
  try {
      const result = await getFallbackPlantFlow();
      
      // Validate the output against the schema before returning
      // This is a safety check to ensure the data is in the expected format.
      DrawPlantOutputSchema.parse(result);

      return result;

    } catch (error: any) {
      console.error("CRITICAL DRAW FAILURE in Server Action:", error);
      // This will be caught by the client and trigger the error toast.
      throw new Error(`The drawing system failed. Reason: ${error.message}`);
    }
}
