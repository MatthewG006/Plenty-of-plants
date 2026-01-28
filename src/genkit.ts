'use server';
// src/genkit.ts
import { genkit } from "@genkit-ai/core";
import { googleAI } from "@genkit-ai/google-genai";

// Initialize a single AI client with the Google AI plugin
export const ai = genkit({
  plugins: [googleAI()],
  traceStore: 'noop',
  flowStateStore: 'noop'
});

// ------------------------
// Text generation example
// ------------------------
export async function generateText(prompt: string): Promise<string> {
  if (!prompt) throw new Error("Prompt is required");

  const response = await ai.generate({
    model: "googleai/gemini-2.5-flash-lite",
    prompt
  });
  return response.text;
}

// ------------------------
// Plant description function
// ------------------------
export async function plantADay(): Promise<string> {
  const prompt = "Give me a random plant name and a short description.";
  const response = await ai.generate({
    model: "googleai/gemini-2.5-flash-lite",
    prompt
  });
  return response.text;
}

// ------------------------
// Plant image generation function
// ------------------------
export async function generateImage(plantName: string): Promise<{ imageUrl: string }> {
  if (!plantName) throw new Error("plantName is required");

  // Using a text-to-image prompt
  const prompt = `Generate a high-quality realistic image of the plant: ${plantName}`;
  const { media } = await ai.generate({
    model: 'googleai/imagen-4.0-fast-generate-001',
    prompt,
  });

  return {
    imageUrl: media?.url ?? ""
  };
}
