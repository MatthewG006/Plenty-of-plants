
'use server';
/**
 * @fileOverview A flow for evolving an existing plant.
 *
 * - evolvePlant - A function that generates an evolved version of a plant.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import {z} from 'zod';
import { EvolvePlantInputSchema, EvolvePlantOutputSchema, type EvolvePlantInput, type EvolvePlantOutput } from '@/interfaces/plant';

const ai = genkit({
    plugins: [googleAI()],
});


export async function evolvePlant(input: EvolvePlantInput): Promise<EvolvePlantOutput> {
  return evolvePlantFlow(input);
}

const personalityPrompt = ai.definePrompt({
    name: 'plantPersonalityPrompt',
    model: 'gemini-pro',
    input: { schema: z.object({ name: z.string() }) },
    output: { schema: z.object({ personality: z.string().describe("A single, one-word personality trait (e.g., 'bubbly', 'wise', 'sassy').") }) },
    prompt: `Based on the plant name "{{name}}", what is a fitting one-word personality trait for it?`,
});


const evolvePlantFlow = ai.defineFlow(
  {
    name: 'evolvePlantFlow',
    inputSchema: EvolvePlantInputSchema,
    outputSchema: EvolvePlantOutputSchema,
  },
  async ({ name, baseImageDataUri, form }) => {
    try {
      let promptText = '';
      if (form === 'Base') {
        promptText = `This is a plant character named ${name}. Your task is to generate an evolved, more mature version of this exact plant.

**CRITICAL INSTRUCTIONS:**
1.  **Evolve the Plant ONLY:** The changes should apply *only* to the plant itself. Make it bigger, more detailed, or add features like small flowers, glowing effects, or extra leaves.
2.  **The Pot MUST NOT Change:** The pot it is in must remain absolutely identical to the original image. Do not change its color, shape, size, or the happy face on it.
3.  **Maintain Art Style:** The overall art style and character design must be consistent with the original.
4.  **The Background:** The background of the image MUST be a solid white color. It absolutely cannot be black or any other color.

The final image should clearly be the same character, just a more advanced version. Do NOT change the core character, pot, or face.`;
      } else { // Evolved to Final form
        promptText = `This is an evolved plant character named ${name}. Your task is to generate its final, most powerful form.

**CRITICAL INSTRUCTIONS:**
1.  **Evolve the Plant ONLY:** The plant should look significantly more majestic and powerful. Add features like a radiant aura, crystalline structures, floating particles, or intricate patterns. It should be the ultimate version of this character.
2.  **The Pot MUST NOT Change:** The pot it is in must remain absolutely identical to the original image. Do not change its color, shape,size, or the happy face on it.
3.  **Maintain Art Style:** The overall art style must be consistent, but clearly show a powerful transformation.
4.  **The Background:** The background of the image MUST be a solid white color. It absolutely cannot be black or any other color.

The final image should be an epic evolution, but still recognizably the same character in the same pot.`;
      }

      const { media } = await ai.generate({
        model: 'gemini-1.5-flash',
        prompt: [
          {media: {url: baseImageDataUri}},
          {text: promptText}
        ],
      });

      if (!media || !media.url) {
        throw new Error('Could not generate evolved plant image from AI.');
      }
      
      let personality;
      if (form === 'Evolved') {
        const { output } = await personalityPrompt({ name });
        if (output) {
          personality = output.personality;
        }
      }
      
      return {
        newImageDataUri: media.url,
        personality: personality,
      };

    } catch (error) {
        console.error("Plant evolution failed.", error);
        // In case of an error, we can just return the original image to avoid breaking the flow.
        // A more robust solution might involve a fallback or retry.
        return {
            newImageDataUri: baseImageDataUri,
            personality: '',
        };
    }
  }
);
