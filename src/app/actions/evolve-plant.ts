
'use server';

// import { evolvePlant } from '@/ai/flows/evolve-plant-flow';
import type { EvolvePlantInput, EvolvePlantOutput } from '@/interfaces/plant';

// export async function evolvePlantAction(input: EvolvePlantInput): Promise<EvolvePlantOutput> {
//   return await evolvePlant(input);
// }

// TODO: This is a temporary measure to allow the app to build.
// The AI features need to be re-implemented.
export async function evolvePlantAction(input: EvolvePlantInput): Promise<EvolvePlantOutput> {
  console.error("evolvePlantAction is temporarily disabled.");
  return Promise.reject(new Error("AI features are temporarily disabled."));
}
