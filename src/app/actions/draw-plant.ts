
'use server';

import { getPlantDetails } from '@/ai/flows/get-plant-details-flow';
import type { GetPlantDetailsInput, GetPlantDetailsOutput } from '@/ai/flows/get-plant-details-flow';

export async function drawPlantAction(input: GetPlantDetailsInput): Promise<GetPlantDetailsOutput> {
  return await getPlantDetails(input);
}

    