
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
import { z } from 'zod';
import { ai } from '@/ai/genkit';

export const GetPlantDetailsInputSchema = z.object({
  existingNames: z.array(z.string()).describe('An array of plant names that already exist in the user\'s collection to avoid duplication.'),
});
export type GetPlantDetailsInput = z.infer<typeof GetPlantDetailsInputSchema>;

export const GetPlantDetailsOutputSchema = z.object({
  name: z.string().describe('The creative and unique name of the plant, avoiding common plant names.'),
  description: z.string().describe('A short, one-sentence, whimsical description of the plant.'),
});
export type GetPlantDetailsOutput = z.infer<typeof GetPlantDetailsOutputSchema>;


export async function getPlantDetails(input: GetPlantDetailsInput): Promise<GetPlantDetailsOutput> {
  return getPlantDetailsFlow(input);
}

const getPlantDetailsPrompt = ai.definePrompt({
  name: 'getPlantDetailsPrompt',
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
