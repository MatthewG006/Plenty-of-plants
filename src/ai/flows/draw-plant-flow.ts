
'use server';
/**
 * @fileOverview A flow for drawing a new, unique plant.
 *
 * - drawPlant - A function that generates a new plant.
 * - DrawPlantOutput - The return type for the drawPlant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getFallbackPlantFlow } from './get-fallback-plant-flow';


const DrawPlantInputSchema = z.object({});

const DrawPlantOutputSchema = z.object({
  name: z.string().describe('The creative and unique name of the new plant.'),
  description: z.string().describe('A short, whimsical description of the plant.'),
  imageDataUri: z
    .string()
    .describe(
      "A generated image of the plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
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
          'A simple visual prompt for an image generation model to create a picture of this plant. e.g., "A whimsical glowing mushroom plant with a happy face."'
        ),
    }),
  },
  prompt: `You are a creative botanist for a game about collecting magical plants. Generate one new, unique, and whimsical plant. The plant should have a two-word name, a short one-sentence description, and a prompt for an image generator. The plant should sound like a cute character.`,
});

const drawPlantFlow = ai.defineFlow(
  {
    name: 'drawPlantFlow',
    inputSchema: DrawPlantInputSchema,
    outputSchema: DrawPlantOutputSchema,
  },
  async () => {
    try {
      // Step 1: Generate the plant's details first and wait for the result.
      const { output: plantDetails } = await plantDetailsPrompt({});
      
      if (!plantDetails) {
        throw new Error('Could not generate plant details.');
      }

      // Step 2: Use the details from Step 1 to generate the image.
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `A cute, 2D vector art illustration of a magical plant character, similar in style to a happy cartoon fern. The plant is: ${plantDetails.imagePrompt}. The plant must be in a simple terracotta pot. The pot must have a happy, smiling face on it. The style should be clean, with bold black outlines, suitable for a mobile game. The background must be solid white.`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      // Step 3: Check if the image was generated successfully.
      if (!media || !media.url) {
        throw new Error('Could not generate plant image from AI.');
      }

      // Step 4: Return the complete plant data.
      return {
        name: plantDetails.name,
        description: plantDetails.description,
        imageDataUri: media.url,
      };
    } catch (error) {
        // If any step in the try block fails, trigger the fallback.
        console.error("Primary plant generation failed, triggering fallback.", error);
        const fallbackPlant = await getFallbackPlantFlow({});
        return fallbackPlant;
    }
  }
);
