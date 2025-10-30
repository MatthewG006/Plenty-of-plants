
'use server';

import { getPlantDetails } from '@/ai/flows/get-plant-details-flow';
import type { GetPlantDetailsInput } from '@/interfaces/plant';

// This server action is now ONLY responsible for generating text.
// All Firebase Storage and image handling is moved to the client to avoid
// server-side authentication issues and CORS problems.
export async function drawPlantAction(input: GetPlantDetailsInput): Promise<{name: string, description: string, hint: string}> {
  
  const { name, description } = await getPlantDetails(input);

  return { 
      name, 
      description, 
      hint: name.toLowerCase().split(' ').slice(0, 2).join(' ') 
  };
}
