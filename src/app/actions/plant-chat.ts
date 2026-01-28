'use server';
/**
 * @fileOverview A plant chat AI agent.
 *
 * - plantChatAction - A function that handles the plant chat process.
 */
import { ai } from '@/genkit';
import { z } from 'zod';
import { PlantChatInputSchema, PlantChatOutputSchema, type PlantChatInput, type PlantChatOutput } from '@/interfaces/plant';

const chatPrompt = ai.definePrompt({
    name: 'plantChatPrompt',
    input: { schema: PlantChatInputSchema },
    output: { schema: PlantChatOutputSchema },
    prompt: `You are a plant in a game. Your name is "{{plantName}}". Your personality is described as "{{plantPersonality}}". Your current form is "{{form}}".

You are talking to the user. Keep your responses short, in character, and appropriate for a friendly game.

Here is the conversation history so far:
{{#if history}}
{{#each history}}
{{this.role}}: {{this.content}}
{{/each}}
{{/if}}

user: {{userMessage}}
model:`,
});

const plantChatFlow = ai.defineFlow(
    {
        name: 'plantChatFlow',
        inputSchema: PlantChatInputSchema,
        outputSchema: PlantChatOutputSchema,
    },
    async (input) => {
        const { output } = await chatPrompt(input);
        return output!;
    }
);

export async function plantChatAction(input: PlantChatInput): Promise<PlantChatOutput> {
    return plantChatFlow(input);
}
