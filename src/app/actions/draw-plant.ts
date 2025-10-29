
'use server';

import { getPlantDetails } from '@/ai/flows/get-plant-details-flow';
import type { DrawPlantOutput, GetPlantDetailsInput } from '@/interfaces/plant';

// This server action is now only responsible for generating the text details for a plant.
// The image fetching has been moved to the client to bypass server credential issues.
export async function getPlantDetailsAction(input: GetPlantDetailsInput): Promise<Omit<DrawPlantOutput, 'imageDataUri'>> {
  try {
    const { name, description } = await getPlantDetails(input);
    return { name, description };
  } catch (error: any) {
    console.error("Error in getPlantDetailsAction:", error);
    // Provide a hardcoded fallback in case of any AI-related error
    return {
        name: "Failsafe Fern",
        description: "A resilient plant that appears when things go wrong.",
        hint: 'fern',
    }
  }
}

// The drawPlantAction is no longer used, as the logic has been moved to the client
// and a more specific getPlantDetailsAction has been created.
// It can be removed in the future if no longer referenced.
export async function drawPlantAction(existingNames: string[]): Promise<DrawPlantOutput> {
  throw new Error("drawPlantAction is deprecated. Use getPlantDetailsAction and fetch image on client.");
}
