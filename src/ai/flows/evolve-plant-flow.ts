'use server';
/**
 * @fileOverview A flow for evolving a plant to its next form.
 *
 * - evolvePlant - A function that handles the evolution process.
 * - EvolvePlantInput - The input type for the evolvePlant function.
 * - EvolvePlantOutput - The return type for the evolvePlant function.
 */
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import { EvolvePlantInputSchema, EvolvePlantOutputSchema, type EvolvePlantInput, type EvolvePlantOutput } from '@/interfaces/plant';
import { ai } from '@/lib/genkit';

const EvolvePlantPrompt = ai.definePrompt({
    name: 'evolvePlantPrompt',
    model: googleAI.model('gemini-1.5-flash'),
    input: { schema: EvolvePlantInputSchema },
    // This model does not support structured JSON output, so we remove the output schema.
    // We will get the image from the `media` property and personality from the text output.
    config: {
        responseModalities: ['TEXT', 'IMAGE'],
    },
    prompt: `You are an expert botanist artist for a whimsical game about collecting digital plants.
Your task is to evolve a plant into its next, more majestic form. You will generate a new image for the plant.

**CRITICAL INSTRUCTIONS:**
1.  You will be given the plant\'s name, its current form ("Base" or "Evolved"), and an image of its current form.
2.  Generate a new image that represents the next stage of its evolution.
    - If the current form is "Base", the new form should be "Evolved": more complex, larger, perhaps with flowers or more intricate leaves.
    - If the current form is "Evolved", the new form should be "Final": a truly fantastical and unique final stage. It should look mystical and powerful.
3.  If evolving to the "Final" form, you MUST also generate a one-word personality trait for the plant (e.g., "Grumpy", "Scholarly", "Joyful", "Dramatic"). Do not generate a personality for the "Evolved" form. Your text response should contain ONLY the single word for the personality.

Plant Name: {{{name}}}
Current Form: {{{form}}}
Current Image: {{media url=baseImageDataUri}}

Generate the evolved plant image and, if applicable, its personality.`,
});

export const evolvePlantAction = ai.defineFlow(
    {
        name: 'evolvePlantFlow',
        inputSchema: EvolvePlantInputSchema,
        outputSchema: EvolvePlantOutputSchema,
    },
    async (input) => {
        const { text, media } = await EvolvePlantPrompt(input);
        
        if (!media) {
            throw new Error("The AI failed to generate an evolved plant image.");
        }
        
        // The personality is now in the `text` property if generated.
        const personality = text?.trim() || undefined;
        
        return {
            newImageDataUri: media.url,
            personality: personality,
        };
    }
);
