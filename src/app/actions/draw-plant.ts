
'use server';

import { getPlantDetails } from '@/ai/flows/get-plant-details-flow';
import type { GetPlantDetailsInput } from '@/interfaces/plant';

// This server action is now ONLY responsible for generating text.
// All Firebase Storage and image handling is moved to the client to avoid
// server-side authentication issues and CORS problems.
export async function drawPlantAction(input: GetPlantDetailsInput): Promise<{name: string, description: string, hint: string}> {
  
  // This call is failing. We will remove it and handle name/description on the client.
  // const { name, description } = await getPlantDetails(input);

  // For now, we return a placeholder. The client will override this.
  const name = "New Plant";
  const description = "A lovely new plant for your collection.";

  return { 
      name, 
      description, 
      hint: name.toLowerCase().split(' ').slice(0, 2).join(' ') 
  };
}
