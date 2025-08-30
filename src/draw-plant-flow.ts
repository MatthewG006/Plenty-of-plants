
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
import fs from 'fs/promises';
import path from 'path';


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

const qualityControlPrompt = ai.definePrompt({
  name: 'qualityControlPrompt',
  input: {
    schema: z.object({
      imageDataUri: z.string(),
      rules: z.string(),
    }),
  },
  output: {
    schema: z.object({
      isValid: z.boolean().describe('Whether the image meets all the rules.'),
      reason: z.string().optional().describe('The reason for failure, if any.'),
    }),
  },
  prompt: `You are an art director for a video game. Your job is to perform quality control on AI-generated images.
Analyze the following image and determine if it strictly follows all of the provided rules.

**Image to Analyze:**
{{media url=imageDataUri}}

**Rules:**
{{{rules}}}

Does the image pass inspection?
`,
});

const drawPlantFlow = ai.defineFlow(
  {
    name: 'drawPlantFlow',
    inputSchema: DrawPlantInputSchema,
    outputSchema: DrawPlantOutputSchema,
  },
  async ({ existingNames }) => {
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
        try {
            // Step 1: Generate the plant's details first and wait for the result.
            const { output: plantDetails } = await plantDetailsPrompt({ existingNames });
            
            if (!plantDetails) {
                throw new Error('Could not generate plant details.');
            }

            // Step 2: Try to read the reference image from the filesystem.
            let referenceImageDataUri: string | null = null;
            try {
                const imagePath = path.join(process.cwd(), 'public', 'fern.png');
                const referenceImageBuffer = await fs.readFile(imagePath);
                referenceImageDataUri = `data:image/png;base64,${referenceImageBuffer.toString('base64')}`;
            } catch (e) {
                console.warn("Could not load reference image 'fern.png'. Generating image without it.", e);
            }

            // Step 3: Build the prompt. If there's a reference image, include it.
            const imageGenPrompt: (any)[] = [];
            
            if (referenceImageDataUri) {
                imageGenPrompt.push({ media: { url: referenceImageDataUri, contentType: 'image/png' } });
                imageGenPrompt.push({ text: `Your primary goal is to replicate the art style of the provided reference image EXACTLY. Create a new plant character based on the description: "${plantDetails.imagePrompt}".\n\n${imageGenerationRules}` });
            } else {
                imageGenPrompt.push({ text: `Create a new plant character based on the description: "${plantDetails.imagePrompt}".\n\n${imageGenerationRules}` });
            }

            // Step 4: Use the details to generate the new plant image.
            const result = await ai.generate({
                model: 'googleai/gemini-2.0-flash-preview-image-generation',
                prompt: imageGenPrompt,
                config: {
                responseModalities: ['TEXT', 'IMAGE'],
                },
            });

            const media = result.media;

            // Step 5: Check if the image was generated successfully.
            if (!media || !media.url) {
                throw new Error('Could not generate plant image from AI.');
            }

            // Step 6: Perform Quality Control check.
            const { output: qcResult } = await qualityControlPrompt({
                imageDataUri: media.url,
                rules: imageGenerationRules,
            });

            if (!qcResult || !qcResult.isValid) {
                throw new Error(`Image failed QC: ${qcResult?.reason}`);
            }

            // Step 7: We are no longer saving the newly generated image as a fallback
            // since fallbacks are now managed in Firebase Storage.

            // Step 8: Return the complete plant data if everything is successful.
            return {
                name: plantDetails.name,
                description: plantDetails.description,
                imageDataUri: media.url,
            };

        } catch (error: any) {
            retries++;
            if (error.message && error.message.includes('API key not valid')) {
                console.error("Authentication Error: The provided Google AI API key is invalid or missing.", error);
                throw new Error("Invalid API Key"); // Re-throw to be caught by the client
            }
            
            console.warn(`Attempt ${retries} failed for drawPlantFlow. Reason: ${error.message}. Retrying...`);
            
            if (retries > maxRetries) {
                console.error("Primary plant generation failed after all retries, triggering fallback.", error);
                return getFallbackPlantFlow({ existingNames });
            }
        }
    }
    
    // This should not be reached if logic is correct, but as a failsafe:
    console.error("drawPlantFlow exhausted retries and did not return a value. Triggering fallback.");
    return getFallbackPlantFlow({ existingNames });
  }
);
