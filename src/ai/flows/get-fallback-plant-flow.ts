
'use server';
/**
 * @fileOverview A flow for providing a fallback plant when the primary generation fails.
 *
 * - getFallbackPlantFlow - A function that returns a pre-packaged plant image with a generated name/description.
 * - GetFallbackPlantOutput - The return type for the getFallbackPlant function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetFallbackPlantOutputSchema = z.object({
  name: z.string().describe('The creative and unique name of the new plant.'),
  description: z.string().describe('A short, whimsical description of the plant.'),
  imageDataUri: z
    .string()
    .describe(
      "A generated image of the plant, as a public URL."
    ),
});

export type GetFallbackPlantOutput = z.infer<typeof GetFallbackPlantOutputSchema>;

const fallbackPlantDetailsPrompt = ai.definePrompt({
    name: 'fallbackPlantDetailsPrompt',
    input: { 
        schema: z.object({
            plantType: z.string().describe("The type of plant, e.g. 'succulent', 'fern'.")
        }) 
    },
    output: {
      schema: z.object({
        name: z
          .string()
          .describe(
            'A creative and unique two-word name for the provided plant type.'
          ),
        description: z
          .string()
          .describe(
            'A short, whimsical, one-sentence description for this plant.'
          ),
      }),
    },
    prompt: `You are a creative botanist for a game. For the plant type "{{plantType}}", generate a unique two-word name and a whimsical one-sentence description for it.`,
});

// A list of pre-packaged fallback plants with public URLs.
const hardcodedFallbacks = [
    { type: 'Cactus', url: '/fallback-plants/fallback1.png' },
    { type: 'Flower', url: '/fallback-plants/fallback2.png' },
    { type: 'Mushroom', url: '/fallback-plants/fallback3.png' },
    { type: 'Succulent', url: '/fallback-plants/fallback4.png' },
    { type: 'Sprout', url: '/fallback-plants/fallback5.png' },
];

export const getFallbackPlantFlow = ai.defineFlow(
  {
    name: 'getFallbackPlantFlow',
    inputSchema: z.object({
        existingNames: z.array(z.string()).optional().describe("A list of existing plant names to avoid duplicating."),
    }),
    outputSchema: GetFallbackPlantOutputSchema,
  },
  async ({ existingNames }) => {
    try {
        // Select a random fallback plant from the hardcoded list.
        const fallbackChoice = hardcodedFallbacks[Math.floor(Math.random() * hardcodedFallbacks.length)];

        // Generate a new name and description for the selected plant type.
        const { output } = await fallbackPlantDetailsPrompt({ plantType: fallbackChoice.type });

        if (!output) {
            throw new Error('Could not generate details for fallback plant.');
        }

        return {
            ...output,
            imageDataUri: fallbackChoice.url,
        };
    } catch (error: any) {
        console.error("Critical error in fallback flow, returning a default hardcoded plant.", error);
        // This is a final failsafe to prevent a crash.
        return {
            name: "Sturdy Sprout",
            description: "A reliable little plant that shows up when you need it most.",
            imageDataUri: "/fallback-plants/fallback5.png" 
        };
    }
  }
);
