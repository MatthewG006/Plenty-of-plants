
'use server';

/**
 * @fileoverview This file initializes and configures the Genkit AI toolkit.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize the Google AI plugin with the API key from environment variables.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  // Log all traces to the console for debugging.
  logSinks: [console.log.bind(console)],
  // Enable tracing in development.
  traceStore: 'dev',
});
