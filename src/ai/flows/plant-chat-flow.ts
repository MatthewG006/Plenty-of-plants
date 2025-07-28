
'use server';
/**
 * @fileOverview A flow for chatting with a plant.
 *
 * - plantChat - A function that handles the chat interaction.
 * - PlantChatInput - The input type for the plantChat function.
 * - PlantChatOutput - The return type for the plantChat function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConversationTurnSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const PlantChatInputSchema = z.object({
  plantName: z.string().describe("The name of the plant."),
  plantPersonality: z.string().describe("The plant's personality trait."),
  userMessage: z.string().describe("The user's message to the plant."),
  history: z.array(ConversationTurnSchema).optional().describe("The previous conversation history."),
});
export type PlantChatInput = z.infer<typeof PlantChatInputSchema>;

const PlantChatOutputSchema = z.object({
  response: z.string().describe("The plant's response to the user."),
});
export type PlantChatOutput = z.infer<typeof PlantChatOutputSchema>;


export async function plantChat(input: PlantChatInput): Promise<PlantChatOutput> {
  return plantChatFlow(input);
}

const plantChatPrompt = ai.definePrompt({
  name: 'plantChatPrompt',
  input: { schema: PlantChatInputSchema },
  output: { schema: PlantChatOutputSchema },
  prompt: `You are a plant character in a game. Your name is {{plantName}} and you have a {{plantPersonality}} personality.
Respond to the user's message in character. Keep your responses short and cute, like a text message. Do not use emojis.

{{#if history}}
Conversation History:
{{#each history}}
{{#if (eq role 'user')}}User: {{content}}{{/if}}
{{#if (eq role 'model')}}You: {{content}}{{/if}}
{{/each}}
{{/if}}

User's new message: {{userMessage}}
Your response:`,
});

const plantChatFlow = ai.defineFlow(
  {
    name: 'plantChatFlow',
    inputSchema: PlantChatInputSchema,
    outputSchema: PlantChatOutputSchema,
  },
  async (input) => {
    const { output } = await plantChatPrompt(input);
    return {
      response: output?.response || "I'm a little sleepy right now...",
    };
  }
);
