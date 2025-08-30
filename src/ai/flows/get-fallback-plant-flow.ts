
'use server';
/**
 * @fileOverview A flow for providing a fallback plant when the primary generation fails.
 *
 * - getFallbackPlantFlow - A function that returns a pre-packaged plant image with a generated name/description.
 * - GetFallbackPlantOutput - The return type for the getFallbackPlant function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { storage } from '@/lib/firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import path from 'path';

const GetFallbackPlantOutputSchema = z.object({
  name: z.string().describe('The creative and unique name of the new plant.'),
  description: z.string().describe('A short, whimsical description of the plant.'),
  imageDataUri: z
    .string()
    .describe(
      "A generated image of the plant, as a public URL from Firebase Storage."
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

const getHardcodedFallback = () => {
    return {
        name: "Sturdy Sprout",
        description: "A reliable little plant that shows up when you need it most.",
        // 1x1 transparent png
        imageDataUri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" 
    };
};

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
        const fallbackDirRef = ref(storage, 'fallback-plants');
        const fileList = await listAll(fallbackDirRef);

        if (fileList.items.length === 0) {
            console.warn("No fallback images found in Firebase Storage. Returning hardcoded plant.");
            return getHardcodedFallback();
        }

        const randomImageRef = fileList.items[Math.floor(Math.random() * fileList.items.length)];
        const plantType = path.parse(randomImageRef.name).name; // e.g., "succulent" from "succulent.png"
        
        const imageUrl = await getDownloadURL(randomImageRef);

        const { output: plantDetails } = await fallbackPlantDetailsPrompt({ plantType });
        
        if (!plantDetails) {
            throw new Error("Could not generate details for fallback.");
        }

        return {
            name: plantDetails.name,
            description: plantDetails.description,
            imageDataUri: imageUrl,
        };
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
             console.warn("The 'fallback-plants' folder does not exist in your Firebase Storage bucket. Please create it and upload images. Returning hardcoded plant.");
        } else {
             console.error("Critical error in fallback flow, returning hardcoded plant.", error);
        }
        // This is a final failsafe to prevent a crash.
        return getHardcodedFallback();
    }
  }
);
