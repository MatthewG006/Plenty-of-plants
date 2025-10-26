
'use server';

import { getFallbackPlantFlow, type GetFallbackPlantOutput } from '@/ai/flows/get-fallback-plant-flow';

export async function drawPlantAction(existingNames: string[] = []): Promise<GetFallbackPlantOutput> {
  // Directly call the correct flow that fetches from storage.
  // The input 'existingNames' is no longer used but is kept to avoid breaking the calling function signature.
  return await getFallbackPlantFlow();
}
