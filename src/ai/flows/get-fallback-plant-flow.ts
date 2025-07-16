
'use server';
/**
 * @fileOverview A flow for providing a fallback plant when the primary generation fails.
 *
 * - getFallbackPlant - A function that returns a pre-packaged plant image with a generated name/description.
 * - GetFallbackPlantOutput - The return type for the getFallbackPlant function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import fs from 'fs/promises';
import path from 'path';

const BUILT_IN_FALLBACK_PLANTS_DIR = path.join(process.cwd(), 'public', 'fallback-plants');

// Add a hardcoded list of built-in plants as a final fallback.
const BUILT_IN_PLANTS: Record<string, { name: string; file: string }> = {
    "succulent": { name: "Sunny Succulent", file: "succulent.png" },
    "cactus": { name: "Happy Cactus", file: "cactus.png" },
    "flower": { name: "Blushing Bloom", file: "flower.png" },
};
const PLANT_TYPES = Object.keys(BUILT_IN_PLANTS) as [string, ...string[]];


// Helper function to convert image file to data URI
async function toDataURL(filePath: string, mimeType: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const base64 = fileBuffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
}

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
      schema: z.object({
        plantType: z.enum(PLANT_TYPES).describe('The type of plant to generate.'),
        name: z
          .string()
          .describe(
            'A creative and unique two-word name for this type of plant.'
          ),
        description: z
          .string()
          .describe(
            'A short, whimsical, one-sentence description for this plant.'
          ),
      }),
    },
    prompt: `You are a creative botanist for a game. Randomly select one of the following plant types: ${PLANT_TYPES.join(', ')}. Then, generate a unique two-word name and a whimsical one-sentence description for it.`,
});


const getFallbackPlantFlow = ai.defineFlow(
  {
    name: 'getFallbackPlantFlow',
    inputSchema: z.object({}),
    outputSchema: GetFallbackPlantOutputSchema,
  },
  async () => {
    try {
        const { output: plantDetails } = await fallbackPlantDetailsPrompt({});
        
        if (!plantDetails || !BUILT_IN_PLANTS[plantDetails.plantType]) {
            throw new Error("Could not generate details for fallback.");
        }

        const chosenPlant = BUILT_IN_PLANTS[plantDetails.plantType];
        const imagePath = path.join(BUILT_IN_FALLBACK_PLANTS_DIR, chosenPlant.file);
        const imageDataUri = await toDataURL(imagePath, 'image/png');

        return {
            name: plantDetails.name,
            description: plantDetails.description,
            imageDataUri,
        };
    } catch (error) {
        console.error("Critical error: Could not load or generate fallback plant.", error);
        // This is a final failsafe to prevent a crash, returning a transparent pixel.
        return {
            name: "Resilient Sprout",
            description: "This little sprout survived a digital apocalypse to be here!",
            imageDataUri: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        };
    }
  }
);


export async function getFallbackPlant(): Promise<GetFallbackPlantOutput> {
  return getFallbackPlantFlow({});
}
