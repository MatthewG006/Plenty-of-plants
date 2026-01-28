'use server';

import { ai } from '@/genkit';
import { EvolvePlantInput, EvolvePlantOutput } from '@/interfaces/plant';

export async function evolvePlantAction(
  input: EvolvePlantInput
): Promise<EvolvePlantOutput> {
  const nextForm = input.form === 'Base' ? 'Evolved' : 'Final';
  const isFinalForm = nextForm === 'Final';

  const evolutionPrompt = `This is an image of a plant named "${input.name}". It is evolving from its "${input.form}" form to its "${nextForm}" form. Make it look more detailed, mature, and fantastical. ${isFinalForm ? 'It should look like a legendary, ultimate version of the plant.' : 'It should be a clear progression, but not the final form yet.'} Do not include any text in the generated image.`;

  const { media } = await ai.generate({
    model: 'googleai/gemini-1.5-flash-latest',
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
    const personalityResponse = await ai.generate({
      prompt: `Provide a single, one-word personality trait for a legendary plant named "${input.name}" that has reached its final form. Examples: "Wise", "Playful", "Serene", "Ancient", "Radiant".`,
    });
    personality = personalityResponse.text.replace(/["'.]/g, '').trim();
  }

  return {
    newImageDataUri: media.url,
    personality,
  };
}
