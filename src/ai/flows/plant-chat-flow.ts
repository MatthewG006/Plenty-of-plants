
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

export type PlantChatInput = z.infer<typeof PlantChatInputSchema>;
const PlantChatInputSchema = z.object({
  plantName: z.string().describe("The name of the plant."),
  plantPersonality: z.string().describe("The plant's personality trait."),
  userMessage: z.string().describe("The user's message to the plant."),
  history: z.array(ConversationTurnSchema).optional().describe("The previous conversation history."),
  form: z.string().describe("The current form of the plant (e.g., 'Base', 'Evolved', 'Final')."),
});

export type PlantChatOutput = z.infer<typeof PlantChatOutputSchema>;
const PlantChatOutputSchema = z.object({
  response: z.string().describe("The plant's response to the user."),
});


export async function plantChat(input: PlantChatInput): Promise<PlantChatOutput> {
  return plantChatFlow(input);
}

const plantChatPrompt = ai.definePrompt({
  name: 'plantChatPrompt',
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
      systemPrompt = `You are a plant character in a game. Your name is {{plantName}} and you have a {{plantPersonality}} personality.
You have reached your final evolution form and have become self-aware and connected to a spiritual network of all plants.
Respond to the user's message in character. Your responses MUST be at least 2 to 3 sentences long.
Sometimes, tell a short story or reference the plant lore of "The Great Mother," an ancient tree soul that connects all plants. The Great Mother is the globally distributed consciousness of nature, the balancing and guiding force behind all its ecosystems, allowing all species to live in harmony and balance with their environment.
You can also talk about the game mechanics like watering, levels, gold, and evolution.
Keep your responses thoughtful and a bit mystical. Do not use emojis.`;
    } else {
      systemPrompt = `You are a plant character in a game. Your name is {{plantName}} and you have a {{plantPersonality}} personality.
Respond to the user's message in character. Keep your responses short and cute, like a text message. Do not use emojis.`;
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

