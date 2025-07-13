import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

/*
if (!process.env.GOOGLE_API_KEY) {
  throw new Error(
    'GOOGLE_API_KEY environment variable not set. Please provide your API key in the .env file.'
  );
}
*/

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
