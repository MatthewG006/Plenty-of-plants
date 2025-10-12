
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
  name: z.string().describe('The name of the plant.'),
  description: z.string().describe('The description of the plant.'),
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

const fallbackImagePrompt = ai.definePrompt({
    name: 'fallbackImagePrompt',
    input: { 
        schema: GetFallbackPlantInputSchema
    },
    prompt: `
A 2D, illustrated, cute plant character in a simple terracotta pot with a happy face on it.
The plant's name is "{{name}}" and its description is "{{description}}".

**CRITICAL RULES:**
- The background MUST be a solid, pure white color.
- The image must contain ONLY the single plant character in its pot. NO other objects, text, people, hands, or background elements are allowed.
- The plant and pot must NOT be black.
- The plant must NOT have arms, legs, or a human-like body.
`,
});

export const getFallbackPlantFlow = ai.defineFlow(
  {
    name: 'getFallbackPlantFlow',
    inputSchema: GetFallbackPlantInputSchema,
    outputSchema: GetFallbackPlantOutputSchema,
  },
  async ({ name, description }) => {

    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: await fallbackImagePrompt({ name, description }),
    });

    if (!media || !media.url) {
        throw new Error('Fallback image generation failed to produce an image.');
    }

    return {
        imageDataUri: media.url,
    };
  }
);
