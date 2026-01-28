
'use server';

import { ai } from '@/genkit';
import { EvolvePlantInput, EvolvePlantOutput } from '@/interfaces/plant';

export async function evolvePlantAction(
  input: EvolvePlantInput
): Promise<EvolvePlantOutput> {
  const nextForm = input.form === 'Base' ? 'Evolved' : 'Final';
  const isFinalForm = nextForm === 'Final';

  const evolutionPrompt = `You are an expert botanical artist for a magical plant game. You are evolving a plant named "${input.name}" from its "${input.form}" form to its new "${nextForm}" form.

The game's art style is cute, beautiful, and slightly stylized, not hyperrealistic.

Using the provided image as a base, create the evolved version.

- If the next form is 'Evolved': The plant should look more mature with more growth. Introduce a new, subtle plant element, keeping the face and plant pot the same. It's a clear progression, but save the most dramatic changes for the final form.
- If the next form is 'Final': The plant has finished growing, make it look truly magnificent with new growth and plant elements without altering the face or plant pot.

Important: Do not include any text, letters, or numbers in the generated image. The background should be transparent or easily removable (plain white).`;

  const { media } = await ai.generate({
    model: 'googleai/gemini-2.5-flash-image',
    prompt: [
      { media: { url: input.baseImageDataUri } },
      { text: evolutionPrompt },
    ],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  if (!media?.url) {
    throw new Error('AI image generation failed.');
  }

  let personality: string | undefined;
  if (isFinalForm) {
    const personalityPrompt = `You are a master botanist who can sense the inner spirit of plants. For the legendary plant named "${input.name}", which has just reached its ultimate form, provide a single, powerful, one-word personality trait that captures its essence.

Consider its appearance and potential lore.

Examples: "Ancient", "Serene", "Playful", "Regal", "Mischievous", "Radiant", "Stoic", "Whimsical".

The output should be just the single word.`;
    const personalityResponse = await ai.generate({
      prompt: personalityPrompt,
    });
    personality = personalityResponse.text.replace(/["'.]/g, '').trim();
  }

  return {
    newImageDataUri: media.url,
    personality,
  };
}
