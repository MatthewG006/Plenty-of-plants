
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
import fs from 'fs/promises';
import path from 'path';


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

      // Step 2: Read the reference image from the filesystem.
      const imagePath = path.join(process.cwd(), 'public', 'fern.png');
      const referenceImageBuffer = await fs.readFile(imagePath);
      const referenceImageDataUri = `data:image/png;base64,${referenceImageBuffer.toString('base64')}`;

      // Step 3: Use the details and reference image to generate the new plant image.
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: [
          { media: { url: referenceImageDataUri, contentType: 'image/png' } },
          { text: `Generate a single, solo plant character based on this art style. The new plant is: ${plantDetails.imagePrompt}. The new plant must be in a simple terracotta pot with a happy, smiling face, just like the example. The pot must not have feet. The background must be a solid white color. There must be NO other objects, people, or hands in the image. IMPORTANT: The plant character must NOT have arms or legs.` }
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      // Step 4: Check if the image was generated successfully.
      if (!media || !media.url) {
        throw new Error('Could not generate plant image from AI.');
      }

      // Step 5: Save the newly generated plant image to the fallback folder.
      const fallbackDir = path.join(process.cwd(), 'public', 'fallback-plants');
      const safeFilename = `${plantDetails.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')}.png`;
      const savePath = path.join(fallbackDir, safeFilename);
      
      // Extract the base64 data from the data URI
      const base64Data = media.url.split(';base64,').pop();
      if (base64Data) {
        try {
          await fs.mkdir(fallbackDir, { recursive: true }); // Ensure the directory exists
          await fs.writeFile(savePath, base64Data, 'base64');
          console.log(`Saved new plant image to: ${savePath}`);
        } catch (saveError) {
          // Log the error, but don't fail the entire flow if saving fails.
          console.error(`Failed to save new plant image to fallback folder: ${saveError}`);
        }
      }

      // Step 6: Return the complete plant data.
      return {
        name: plantDetails.name,
        description: plantDetails.description,
        imageDataUri: media.url,
      };
    } catch (error: any) {
        // Check if the error is due to an invalid API key.
        if (error.message && error.message.includes('API key not valid')) {
            console.error("Authentication Error: The provided Google AI API key is invalid or missing.", error);
            // Re-throw a specific error for the UI to catch.
            throw new Error("Invalid API Key");
        }

        // For any other type of error, trigger the fallback.
        console.error("Primary plant generation failed, triggering fallback.", error);
        const fallbackPlant = await getFallbackPlantFlow({});
        return fallbackPlant;
    }
  }
);
