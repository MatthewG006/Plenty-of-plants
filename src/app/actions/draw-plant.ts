
'use server';

import { getPlantDetails } from '@/ai/flows/get-plant-details-flow';
import type { DrawPlantOutput, GetPlantDetailsInput } from '@/interfaces/plant';

// This action is now ONLY responsible for getting a name and description.
// The image fetching is handled on the client-side to avoid server-side auth issues.
export async function getPlantDetailsAction(input: GetPlantDetailsInput): Promise<Omit<DrawPlantOutput, 'imageDataUri'>> {
  try {
    const { name, description } = await getPlantDetails(input);
    return { name, description };

  } catch (error: any) {
    console.error("Error in getPlantDetailsAction:", error);
    // Provide a hardcoded fallback in case of any server-side error
    return {
        name: "Failsafe Fern",
        description: "A resilient plant that appears when things go wrong.",
        hint: 'fern',
    }
  }
}

// This function is deprecated and will no longer be used.
export async function drawPlantAction(input: GetPlantDetailsInput): Promise<DrawPlantOutput> {
  throw new Error("drawPlantAction is deprecated. Use getPlantDetailsAction instead.");
}
