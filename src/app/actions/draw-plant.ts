
'use server';

import { getPlantDetails } from '@/ai/flows/get-plant-details-flow';
import type { DrawPlantOutput } from '@/interfaces/plant';

// This server action is now ONLY responsible for getting the AI-generated name and description.
// All image fetching is handled on the client to avoid server-side auth and CORS issues.
export async function drawPlantAction(existingNames: string[]): Promise<Omit<DrawPlantOutput, 'imageDataUri' | 'hint'>> {
  try {
    const { name, description } = await getPlantDetails({ existingNames });
    return { name, description };
  } catch (error: any) {
    console.error("Error in drawPlantAction (getPlantDetails):", error);
    // Provide a fallback name and description if the AI fails, so the draw doesn't fully break.
    return {
      name: 'Mysterious Bloom',
      description: 'A curious plant that appeared when the AI was sleeping.'
    }
  }
}
