
import {adai, dataConnector} from '@genkit-ai/ai-sdk';
import {defineFlow} from '@genkit-ai/ai-sdk/express';
import * as z from 'zod';

const GameTipSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const getGameTipsFlow = defineFlow(
  {
    name: 'getGameTipsFlow',
    inputSchema: z.object({}),
    outputSchema: z.array(GameTipSchema),
  },
  async () => {
    const tips = await dataConnector({
      location: 'gameTips',
      schema: GameTipSchema,
    });
    return tips.map(tip => ({...tip.data, id: tip.id}));
  }
);
