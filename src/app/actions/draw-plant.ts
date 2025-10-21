
'use server';

import { drawPlant, type DrawPlantOutput } from '@/ai/flows/draw-plant-flow';

export async function drawPlantAction(existingNames: string[] = []): Promise<DrawPlantOutput> {
  return await drawPlant(existingNames);
}
