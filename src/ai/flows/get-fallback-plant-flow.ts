
'use server';
/**
 * @fileOverview A flow for providing a fallback plant image when the primary generation fails.
 *
 * - getFallbackPlantFlow - A function that returns a new image for a given plant name/description.
 * - GetFallbackPlantInput - The input for the flow.
 * - GetFallbackPlantOutput - The return type for the getFallbackPlant function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetFallbackPlantInputSchema = z.object({
  imageGenPrompt: z.string().describe('The full, original prompt for the image generation model.'),
});
export type GetFallbackPlantInput = z.infer<typeof GetFallbackPlantInputSchema>;

const GetFallbackPlantOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A generated image of the plant, as a data URI."
    ),
});

export type GetFallbackPlantOutput = z.infer<typeof GetFallbackPlantOutputSchema>;

export const getFallbackPlantFlow = ai.defineFlow(
  {
    name: 'getFallbackPlantFlow',
    inputSchema: GetFallbackPlantInputSchema,
    outputSchema: GetFallbackPlantOutputSchema,
  },
  async ({ imageGenPrompt }) => {

    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: imageGenPrompt,
    });

    if (!media || !media.url) {
        throw new Error('Fallback image generation also failed to produce an image.');
    }

    return {
        imageDataUri: media.url,
    };
  }
);
