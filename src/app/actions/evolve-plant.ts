
'use server';

import { evolvePlant, type EvolvePlantInput, type EvolvePlantOutput } from '@/ai/flows/evolve-plant-flow';

export async function evolvePlantAction(input: EvolvePlantInput): Promise<EvolvePlantOutput> {
  return await evolvePlant(input);
}
