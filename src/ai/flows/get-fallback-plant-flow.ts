
'use server';
/**
 * @fileOverview A flow for providing a fallback plant when the primary generation fails.
 *
 * - getFallbackPlantFlow - A function that returns a pre-packaged plant image with a generated name/description.
 * - GetFallbackPlantOutput - The return type for the getFallbackPlant function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Add a hardcoded list of built-in plants as a final fallback.
const PLANT_TYPES = ["succulent", "cactus", "flower", "fern", "bonsai"];

const GetFallbackPlantOutputSchema = z.object({
  name: z.string().describe('The creative and unique name of the new plant.'),
  description: z.string().describe('A short, whimsical description of the plant.'),
  imageDataUri: z
    .string()
    .describe(
      "A generated image of the plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});

export type GetFallbackPlantOutput = z.infer<typeof GetFallbackPlantOutputSchema>;

const fallbackPlantDetailsPrompt = ai.definePrompt({
    name: 'fallbackPlantDetailsPrompt',
    input: { schema: z.object({}) },
    output: {
      format: 'json',
      schema: z.object({
        name: z
          .string()
          .describe(
            'A creative and unique two-word name for a randomly chosen type of plant.'
          ),
        description: z
          .string()
          .describe(
            'A short, whimsical, one-sentence description for this plant.'
          ),
      }),
    },
    prompt: `You are a creative botanist for a game. Randomly select one of the following plant types: ${PLANT_TYPES.join(', ')}. Then, generate a unique two-word name and a whimsical one-sentence description for it. Return the response as a JSON object.`,
});


export const getFallbackPlantFlow = ai.defineFlow(
  {
    name: 'getFallbackPlantFlow',
    inputSchema: z.object({}),
    outputSchema: GetFallbackPlantOutputSchema,
  },
  async () => {
    try {
        const { output: plantDetails } = await fallbackPlantDetailsPrompt({});
        
        if (!plantDetails) {
            throw new Error("Could not generate details for fallback.");
        }

        return {
            name: plantDetails.name,
            description: plantDetails.description,
            // Use a placeholder image to avoid filesystem errors.
            imageDataUri: "https://placehold.co/256x256.png",
        };
    } catch (error) {
        console.error("Critical error in fallback AI call, returning hardcoded plant.", error);
        // This is a final failsafe to prevent a crash, especially if the API key is invalid.
        return {
            name: "Resilient Succulent",
            description: "This little plant survived an error to be here!",
            imageDataUri: "https://placehold.co/256x256.png"
        };
    }
  }
);
