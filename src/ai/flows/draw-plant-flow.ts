
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

const DrawPlantInputSchema = z.object({
  existingNames: z.array(z.string()).optional().describe("A list of existing plant names to avoid duplicating."),
});

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

export async function drawPlant(existingNames: string[] = []): Promise<DrawPlantOutput> {
  return drawPlantFlow({ existingNames });
}

const plantDetailsPrompt = ai.definePrompt({
  name: 'plantDetailsPrompt',
  input: {schema: DrawPlantInputSchema},
  output: {
    schema: z.object({
      name: z
        .string()
        .describe(
          'A creative and unique name for a new fantasy plant. Should be two words. Avoid common plant names like "fern" or "cactus".'
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
  prompt: `You are a creative botanist for a 2D game about collecting cute, magical plants. Generate one new, unique, and whimsical plant. The plant should have a cute and simple design, not a strange or other-worldly appearance. The plant must have a highly creative and unusual two-word name that is not a common plant type. It should also have a short, one-sentence description, and a prompt for an image generator.

You MUST NOT use any of the following names:
{{#each existingNames}}
- {{this}}
{{/each}}
`,
});

const drawPlantFlow = ai.defineFlow(
  {
    name: 'drawPlantFlow',
    inputSchema: DrawPlantInputSchema,
    outputSchema: DrawPlantOutputSchema,
  },
  async ({ existingNames }) => {
    
    // ===================================================================
    // TEMPORARY CHANGE: Force all draws to use the fallback plant system.
    // To revert, comment out the line below and uncomment the original
    // 'try/catch' block.
    // ===================================================================
    return getFallbackPlantFlow();

    /*
    // ORIGINAL AI GENERATION LOGIC - Uncomment this block to restore normal behavior
    
    let plantDetails: { name: string, description: string, imagePrompt: string };

    try {
        const { output } = await plantDetailsPrompt({ existingNames });
        if (!output) {
            throw new Error('Could not generate plant details from primary prompt.');
        }
        plantDetails = output;
    } catch (detailsError: any) {
        // If the API key is the problem, this is a critical error. Stop immediately.
        if (detailsError.message && (detailsError.message.includes('API key not valid') || detailsError.message.includes('API_KEY_INVALID'))) {
            console.error("Authentication Error: The provided Google AI API key is invalid or missing.", detailsError);
            throw new Error("Invalid API Key"); // Re-throw to be caught by the client
        }
        
        console.warn(`Plant details generation failed. Using fallback flow. Reason: ${detailsError.message}`);
        // If details generation fails, try to generate a fallback plant from Storage.
        // The fallback flow will generate its own name and description.
        return getFallbackPlantFlow();
    }
    
    const imageGenerationRules = `
You MUST adhere to the following rules without exception:
1. **Art Style:** The final image must have a clean, 2D, illustrated style.
2. **The Pot:** The plant MUST be in a simple, terracotta pot.
3. **The Face:** The pot MUST have a simple, smiling face on it. This is not optional.
4. **The Plant:** The new plant character must be cute and simple. It absolutely MUST NOT have arms, legs, or a human-like body.
5. **Color Constraint:** The plant and pot MUST NOT be black. They should be colorful and vibrant.
6. **The Background:** The background MUST be a solid, pure white color. It absolutely cannot be black or any other color.
7. **Composition:** The image must contain ONLY the single plant character in its pot. NO other objects, text, people, hands, or background elements are allowed.
`;
    
    // Build the prompt for image generation.
    const imageGenPrompt = `Create a new plant character based on the description: "${plantDetails.imagePrompt}".\n\n${imageGenerationRules}`;

    try {
      // Use the details to generate the new plant image.
      const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: imageGenPrompt,
      });

      // Check if the image was generated successfully.
      if (!media || !media.url) {
        throw new Error('Could not generate plant image from AI.');
      }
      
      return {
        name: plantDetails.name,
        description: plantDetails.description,
        imageDataUri: media.url,
      };

    } catch (imageError: any) {
      console.warn(`Primary image generation failed, triggering fallback image flow from Storage. Reason: ${imageError.message}`);
      // If image generation fails, use the fallback flow which pulls from Firebase Storage.
      // It will use its own name/description logic.
      return getFallbackPlantFlow();
    }
    */
  }
);
