
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
          { media: { url: imageDataUri, contentType: 'image/jpeg' } },
          { text: `This is a plant character named ${name}. Your task is to generate an evolved, more mature version of this exact plant.

**CRITICAL INSTRUCTIONS:**
1.  **Evolve the Plant ONLY:** The changes should apply *only* to the plant itself. Make it bigger, more detailed, or add features like small flowers, glowing effects, or extra leaves.
2.  **The Pot MUST NOT Change:** The pot it is in must remain absolutely identical to the original image. Do not change its color, shape, size, or the happy face on it.
3.  **Maintain Art Style:** The overall art style and character design must be consistent with the original.
4.  **The Background:** The background of the image MUST be a solid white color.

The final image should clearly be the same character, just a more advanced version. Do NOT change the core character, pot, or face.` }
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
