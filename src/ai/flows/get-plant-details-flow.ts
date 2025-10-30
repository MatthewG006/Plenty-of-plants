
'use server';
/**
 * @fileOverview A flow for generating a plant's name and description.
 *
 * - getPlantDetails - A function that generates details for a new plant.
 * - GetPlantDetailsInput - The input type for the getPlantDetails function.
 * - GetPlantDetailsOutput - The return type for the getPlantDetails function.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { GetPlantDetailsInputSchema, GetPlantDetailsOutputSchema, type GetPlantDetailsInput, type GetPlantDetailsOutput } from '@/interfaces/plant';

// This is the correct initialization. The `ai` object is configured with plugins.
const ai = genkit({
    plugins: [googleAI()],
});

const getPlantDetailsPrompt = ai.definePrompt({
  name: 'getPlantDetailsPrompt',
  model: 'gemini-1.5-flash',
  input: { schema: GetPlantDetailsInputSchema },
  output: { schema: GetPlantDetailsOutputSchema },
  prompt: `You are a creative botanist for a whimsical game about collecting digital plants.
Your task is to generate a new, unique plant.

**CRITICAL INSTRUCTIONS:**
1.  **Name**: The plant name must be creative, unique, and whimsical. It should not be a common, real-world plant name.
2.  **Description**: Provide a short, one-sentence description that is imaginative and gives the plant character.
3.  **Avoid Duplicates**: Do NOT use any of the names from the following list of existing plants:
    {{#each existingNames}}- {{{this}}}{{/each}}

Generate a new plant that is not on that list.`,
});

// This flow is now correctly defined using the configured `ai` object.
const getPlantDetailsFlow = ai.defineFlow(
  {
    name: 'getPlantDetailsFlow',
    inputSchema: GetPlantDetailsInputSchema,
    outputSchema: GetPlantDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await getPlantDetailsPrompt(input);
    return output!;
  }
);

// This is the only exported function, as required for Server Actions.
export async function getPlantDetails(input: GetPlantDetailsInput): Promise<GetPlantDetailsOutput> {
  return getPlantDetailsFlow(input);
}
