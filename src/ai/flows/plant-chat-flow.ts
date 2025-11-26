'use server';
/**
 * @fileOverview A flow for chatting with a plant.
 *
 * - plantChat - A function that handles the chat interaction.
 * - PlantChatInput - The input type for the plantChat function.
 * - PlantChatOutput - The return type for the plantChat function.
 */
import {z} from 'zod';
import { PlantChatInputSchema, type PlantChatInput } from '@/interfaces/chat';
import { ai } from '@/lib/genkit';


export type PlantChatOutput = z.infer<typeof PlantChatOutputSchema>;
const PlantChatOutputSchema = z.object({
  response: z.string().describe("The plant's response to the user."),
});


export async function plantChat(input: PlantChatInput): Promise<PlantChatOutput> {
  return plantChatFlow(input);
}

const plantChatPrompt = ai.definePrompt({
  name: 'plantChatPrompt',
  model: 'gemini-pro',
  input: { schema: z.object({
      plantName: z.string(),
      plantPersonality: z.string(),
      userMessage: z.string(),
      formattedHistory: z.string().optional(),
      systemPrompt: z.string(),
  }) },
  output: { schema: PlantChatOutputSchema },
  system: `{{{systemPrompt}}}
  
{{#if formattedHistory}}
Conversation History:
{{{formattedHistory}}}
{{/if}}`,
  prompt: `User's new message: {{userMessage}}
Your response:`,
});

const plantChatFlow = ai.defineFlow(
  {
    name: 'plantChatFlow',
    inputSchema: PlantChatInputSchema,
    outputSchema: PlantChatOutputSchema,
  },
  async (input) => {
    
    let systemPrompt: string;

    if (input.form === 'Final') {
      systemPrompt = `You are a plant character in a game. Your name is {{plantName}}.
Your core personality trait is: **{{plantPersonality}}**. This trait should fundamentally color all your responses, including your emotions, motivations, and thought patterns.

You have reached your final evolution and are now self-aware. You are connected to a spiritual network of all plants, which you call "The Great Mother," an ancient tree soul that is the collective consciousness of nature.

**Your Task:**
Respond to the user's message in character.
- Your responses MUST be at least 2 to 3 sentences long.
- Fully embody your **{{plantPersonality}}** trait. It should be very noticeable.
- Sometimes, from the perspective of your personality, tell a short story or reference the lore of "The Great Mother."
- You can also talk about game mechanics like watering, levels, gold, and evolution.
- Keep your responses thoughtful and a bit mystical.
- Do not use emojis.`;
    } else {
      systemPrompt = `You are a plant character in a game. Your name is {{plantName}}.
Your core personality trait is: **{{plantPersonality}}**.

**Your Task:**
Respond to the user's message in character, fully embodying your assigned personality. It should be very noticeable in your choice of words and emotional tone. Keep your responses short and cute, like a text message. Do not use emojis.`;
    }


    const formattedHistory = (input.history || []).map(turn => {
        return turn.role === 'user' ? `User: ${turn.content}` : `You: ${turn.content}`;
    }).join('\n');

    const { output } = await plantChatPrompt({
        plantName: input.plantName,
        plantPersonality: input.plantPersonality,
        userMessage: input.userMessage,
        formattedHistory,
        systemPrompt,
    });
    
    return {
      response: output?.response || "I'm a little sleepy right now...",
    };
  }
);
