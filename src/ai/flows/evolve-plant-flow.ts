'use server';
/**
 * @fileOverview A flow for evolving an existing plant.
 *
 * - evolvePlant - A function that generates an evolved version of a plant.
 * - EvolvePlantInput - The input type for the evolvePlant function.
 * - EvolvePlantOutput - The return type for the evolvePlant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvolvePlantInputSchema = z.object({
  name: z.string().describe('The name of the plant being evolved.'),
  imageDataUri: z
    .string()
    .describe(
      "The current image of the plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type EvolvePlantInput = z.infer<typeof EvolvePlantInputSchema>;

const EvolvePlantOutputSchema = z.object({
  newImageDataUri: z
    .string()
    .describe(
      "The newly generated, evolved image of the plant, as a data URI."
    ),
});
export type EvolvePlantOutput = z.infer<typeof EvolvePlantOutputSchema>;

export async function evolvePlant(input: EvolvePlantInput): Promise<EvolvePlantOutput> {
  return evolvePlantFlow(input);
}

const evolvePlantFlow = ai.defineFlow(
  {
    name: 'evolvePlantFlow',
    inputSchema: EvolvePlantInputSchema,
    outputSchema: EvolvePlantOutputSchema,
  },
  async ({ name, imageDataUri }) => {
    try {
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: [
          { media: { url: imageDataUri, contentType: 'image/png' } },
          { text: `This is a plant character named ${name}. Generate a more grown-up, evolved, or mature version of this exact plant. It should clearly be the same character, but bigger, more detailed, or with added features like small flowers or glowing effects. Keep the same art style, the same pot, and the same happy face. The background must be a solid white color. Do NOT change the core character.` }
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!media || !media.url) {
        throw new Error('Could not generate evolved plant image from AI.');
      }
      
      return {
        newImageDataUri: media.url,
      };

    } catch (error) {
        console.error("Plant evolution failed.", error);
        // In case of an error, we can just return the original image to avoid breaking the flow.
        // A more robust solution might involve a fallback or retry.
        return {
            newImageDataUri: imageDataUri,
        };
    }
  }
);
