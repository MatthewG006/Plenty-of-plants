
'use server';

// import { drawPlant, type DrawPlantOutput } from '@/ai/flows/draw-plant-flow';

// export async function drawPlantAction(existingNames: string[] = []): Promise<DrawPlantOutput> {
//   return await drawPlant(existingNames);
// }

// TODO: This is a temporary measure to allow the app to build.
// The AI features need to be re-implemented.
export async function drawPlantAction(existingNames: string[] = []): Promise<any> {
  console.error("drawPlantAction is temporarily disabled.");
  return Promise.reject(new Error("AI features are temporarily disabled."));
}
