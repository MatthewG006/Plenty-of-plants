'use server';

import { EvolvePlantInput } from '@/interfaces/plant';

export async function evolvePlantAction(input: EvolvePlantInput) {
  const { evolvePlantAction } = await import('@/ai/flows/evolve-plant-flow');
  return await evolvePlantAction(input);
}
