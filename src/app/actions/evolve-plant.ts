
'use server';

import { evolvePlant } from '@/ai/flows/evolve-plant-flow';
import type { EvolvePlantInput, EvolvePlantOutput } from '@/interfaces/plant';

export async function evolvePlantAction(input: EvolvePlantInput): Promise<EvolvePlantOutput> {
  return await evolvePlant(input);
}
