'use server';
/**
 * @fileOverview A flow for drawing a new, unique plant.
 *
 * - drawPlant - A function that generates a new plant.
 * - DrawPlantOutput - The return type for the drawPlant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DrawPlantInputSchema = z.object({});

const DrawPlantOutputSchema = z.object({
  name: z.string().describe('The creative and unique name of the new plant.'),
  description: z.string().describe('A short, whimsical description of the plant.'),
  imageDataUri: z
    .string()
    .describe(
      "A generated image of the plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DrawPlantOutput = z.infer<typeof DrawPlantOutputSchema>;

export async function drawPlant(): Promise<DrawPlantOutput> {
  return drawPlantFlow({});
}

const plantDetailsPrompt = ai.definePrompt({
  name: 'plantDetailsPrompt',
  input: {schema: DrawPlantInputSchema},
  output: {
    schema: z.object({
      name: z
        .string()
        .describe(
          'A creative and unique name for a new fantasy plant. Should be two words.'
        ),
      description: z
        .string()
        .describe(
          'A short, whimsical description for this new plant, in one sentence.'
        ),
      imagePrompt: z
        .string()
        .describe(
          'A simple visual prompt for an image generation model to create a picture of this plant. e.g., "A whimsical glowing mushroom plant."'
        ),
    }),
  },
  prompt: `You are a creative botanist for a game about collecting magical plants. Generate one new, unique, and whimsical plant. The plant should have a two-word name, a short one-sentence description, and a prompt for an image generator.`,
});

const drawPlantFlow = ai.defineFlow(
  {
    name: 'drawPlantFlow',
    inputSchema: DrawPlantInputSchema,
    outputSchema: DrawPlantOutputSchema,
  },
  async () => {
    const {output: plantDetails} = await plantDetailsPrompt({});
    if (!plantDetails) {
      throw new Error('Could not generate plant details.');
    }

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `A digital art illustration of a magical plant: ${plantDetails.imagePrompt}. The plant should be in a simple terracotta pot, centered, on a plain light green background.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const imageDataUri = media.url;

    return {
      name: plantDetails.name,
      description: plantDetails.description,
      imageDataUri,
    };
  }
);
