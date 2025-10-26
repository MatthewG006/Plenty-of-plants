
'use server';

import { drawPlantFlow } from '@/ai/flows/draw-plant-flow';
import type { DrawPlantOutput } from '@/interfaces/plant';

export async function drawPlantAction(existingNames: string[] = []): Promise<DrawPlantOutput> {
  // This action now directly calls the simplified flow that gets a plant from Storage.
  // The AI generation logic has been removed to ensure reliability.
  return await drawPlantFlow();
}
