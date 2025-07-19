
'use server';
/**
 * @fileOverview A flow for generating a fictional community post about a new plant.
 *
 * - getCommunityPost - A function that generates a new community post.
 * - CommunityPost - The return type for the getCommunityPost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CommunityPostOutputSchema = z.object({
  name: z.string().describe('The creative and unique name of the new plant.'),
  description: z.string().describe('A short, whimsical description of the plant.'),
  imageDataUri: z
    .string()
    .describe(
      "A generated image of the plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  username: z.string().describe("A plausible but fictional username for a player in a plant collecting game."),
  avatarColor: z.string().optional().describe("A random HSL color for the user's avatar background."),
});
export type CommunityPost = z.infer<typeof CommunityPostOutputSchema>;

export async function getCommunityPost(): Promise<CommunityPost> {
  return communityPostFlow({});
}

const communityPostDetailsPrompt = ai.definePrompt({
  name: 'communityPostDetailsPrompt',
  input: {schema: z.object({})},
  output: {
    schema: z.object({
      name: z
        .string()
        .describe(
          'A creative and unique name for a new fantasy plant. Should be two words.'
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
      username: z
        .string()
        .describe(
          'A creative and plausible username for a player in a game about collecting cute plants. e.g., "LeafLover23", "SproutSeeker", "BotanyBard".'
        ),
    }),
  },
  prompt: `You are a creative director for a 2D game about collecting cute, magical plants. Generate the details for a fictional community post. This includes a new plant, and a username for the player who "found" it. The plant should have a cute and simple design, not a strange or other-worldly appearance.`,
});

const communityPostFlow = ai.defineFlow(
  {
    name: 'communityPostFlow',
    inputSchema: z.object({}),
    outputSchema: CommunityPostOutputSchema,
  },
  async () => {
    try {
      // Step 1: Generate the post details (plant name, description, image prompt, username).
      const { output: postDetails } = await communityPostDetailsPrompt({});
      
      if (!postDetails) {
        throw new Error('Could not generate community post details.');
      }

      // Step 2: Define the image generation rules.
       const rules = `
        You MUST adhere to the following rules without exception:
        1. **Art Style:** The final image must have a clean, 2D, illustrated style.
        2. **The Pot:** The plant MUST be in a simple, smiling terracotta pot.
        3. **The Plant:** The new plant character must be cute and simple.
        4. **The Background:** The background MUST be a solid, pure white. No gradients, textures, or shadows.
        5. **Composition:** The image must contain ONLY the single plant character in its pot. NO other objects, text, or background elements are allowed.
      `;

      // Step 3: Use the details to generate the new plant image.
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `Create a new plant character based on the description: "${postDetails.imagePrompt}".\n\n${rules}`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!media || !media.url) {
        throw new Error('Could not generate plant image for community post from AI.');
      }

      // Step 4: Return the complete post data.
      return {
        name: postDetails.name,
        description: postDetails.description,
        username: postDetails.username,
        imageDataUri: media.url,
      };

    } catch (error: any) {
        console.error("Community post generation failed.", error);
        // Provide a hardcoded fallback to ensure the UI doesn't break
        return {
            name: "Mysterious Bloom",
            description: "A very special plant found deep in the enchanted forest.",
            username: "FloraExplorer",
            imageDataUri: "https://placehold.co/300x300.png"
        };
    }
  }
);
