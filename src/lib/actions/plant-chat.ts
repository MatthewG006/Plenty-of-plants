
'use server';

import { ai } from '@/genkit';
import { z } from 'zod';
import {
  PlantChatInputSchema,
  type PlantChatInput,
  PlantChatOutputSchema,
  type PlantChatOutput,
} from '@/interfaces/chat';

const plantChatFlow = ai.defineFlow(
  {
    name: 'plantChatFlow',
    inputSchema: PlantChatInputSchema,
    outputSchema: PlantChatOutputSchema,
  },
  async (input) => {
    const { plantName, plantPersonality, userMessage, history, form } = input;

    // Build the history for the prompt
    const promptHistory = history?.map(turn => ({
        role: turn.role,
        content: turn.content,
    }));

    const systemPrompt = `You are a plant named ${plantName}. Your personality is \"${plantPersonality}\". Your current form is \"${form}\".
You are talking to your owner. Keep your responses short, cute, and in character.
Do not reveal that you are an AI.`;

    const { text } = await ai.generate({
      model: 'googleai/gemini-1.5-flash-lite',
      system: systemPrompt,
      prompt: userMessage,
    });
    
    return {
      response: text,
    };
  }
);

export async function plantChatAction(
  input: PlantChatInput
): Promise<PlantChatOutput> {
  return await plantChatFlow(input);
}
