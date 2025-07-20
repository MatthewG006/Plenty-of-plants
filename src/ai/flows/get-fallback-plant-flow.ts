
'use server';
/**
 * @fileOverview A flow for providing a fallback plant when the primary generation fails.
 *
 * - getFallbackPlantFlow - A function that returns a pre-packaged plant image with a generated name/description.
 * - GetFallbackPlantOutput - The return type for the getFallbackPlant function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import fs from 'fs/promises';
import path from 'path';

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

// Helper function to convert image file to data URI
async function toDataURL(filePath: string, mimeType: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const base64 = fileBuffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
}


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
        imageDataUri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAAA1BMVEUAAACnej3aAAAASElEQVR4nO3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIC3AcUIAAFkqh/QAAAAAElFTkSuQmCC" // 1x1 transparent png
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
        const fallbackDir = path.join(process.cwd(), 'public', 'fallback-plants');
        await fs.mkdir(fallbackDir, { recursive: true }); // Ensure the directory exists
        const files = await fs.readdir(fallbackDir);
        const imageFiles = files.filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'));

        if (imageFiles.length === 0) {
            console.warn("No fallback images found. Returning hardcoded plant.");
            return getHardcodedFallback();
        }

        const randomImageFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
        const plantType = path.parse(randomImageFile).name; // e.g., "succulent" from "succulent.png"
        const imagePath = path.join(fallbackDir, randomImageFile);
        const mimeType = `image/${path.extname(randomImageFile).substring(1)}`;

        const imageDataUri = await toDataURL(imagePath, mimeType);

        const { output: plantDetails } = await fallbackPlantDetailsPrompt({ plantType });
        
        if (!plantDetails) {
            throw new Error("Could not generate details for fallback.");
        }

        return {
            name: plantDetails.name,
            description: plantDetails.description,
            imageDataUri: imageDataUri,
        };
    } catch (error) {
        console.error("Critical error in fallback flow, returning hardcoded plant.", error);
        // This is a final failsafe to prevent a crash, especially if the API key is invalid or files are missing.
        return getHardcodedFallback();
    }
  }
);
