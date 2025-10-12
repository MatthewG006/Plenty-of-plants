
'use server';
/**
 * @fileOverview A flow for providing a fallback plant from Firebase Storage when AI generation fails.
 *
 * - getFallbackPlantFlow - A function that returns a random plant image from Storage with a new name/description.
 * - GetFallbackPlantOutput - The return type for the getFallbackPlant function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';


const GetFallbackPlantOutputSchema = z.object({
  name: z.string().describe('The creative name of the fallback plant.'),
  description: z.string().describe('A short, whimsical description of the fallback plant.'),
  imageDataUri: z.string().describe("A plant image from storage, as a data URI."),
});

export type GetFallbackPlantOutput = z.infer<typeof GetFallbackPlantOutputSchema>;

// Helper to fetch an image and convert it to a data URI
async function imageToDataUri(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}


export const getFallbackPlantFlow = ai.defineFlow(
  {
    name: 'getFallbackPlantFlow',
    outputSchema: GetFallbackPlantOutputSchema,
  },
  async () => {
    try {
      const firebaseConfig: FirebaseOptions = {
          apiKey: process.env.GEMINI_API_KEY, // Note: Genkit uses GEMINI_API_KEY, adapt if your env var is different
          authDomain: process.env.FIREBASE_AUTH_DOMAIN,
          projectId: process.env.FIREBASE_PROJECT_ID,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.FIREBASE_APP_ID,
      };
      
      if (!firebaseConfig.projectId || !firebaseConfig.storageBucket) {
        throw new Error("Server-side Firebase configuration for Storage is missing.");
      }

      const app = getApps().length ? getApp() : initializeApp(firebaseConfig, `genkit-fallback-${Date.now()}`);
      const storage = getStorage(app);
      const fallbackDirRef = ref(storage, 'fallback-plants');
      const fileList = await listAll(fallbackDirRef);

      if (fileList.items.length === 0) {
        throw new Error('No fallback images found in Firebase Storage at /fallback-plants/');
      }

      // Select a random image from the list
      const randomFileRef = fileList.items[Math.floor(Math.random() * fileList.items.length)];
      const downloadUrl = await getDownloadURL(randomFileRef);
      const imageDataUri = await imageToDataUri(downloadUrl);

      // Generate a new name and description for this fallback image
      const fallbackDetailsPrompt = `You are a creative botanist. An existing image of a cute plant will be used. Generate a completely new, creative two-word name and a short, one-sentence whimsical description for it. The name must be unique and not a common plant type.`;

      const { output } = await ai.generate({
        prompt: fallbackDetailsPrompt,
        output: {
          schema: z.object({
            name: z.string().describe('A creative two-word name for the plant.'),
            description: z.string().describe('A short, whimsical one-sentence description.'),
          }),
        },
      });

      if (!output) {
        throw new Error('Could not generate details for fallback plant.');
      }

      return {
        name: output.name,
        description: output.description,
        imageDataUri: imageDataUri,
      };
    } catch (error: any) {
      console.error("CRITICAL FALLBACK FAILURE:", error);
      // This is the absolute last resort if Storage or AI fails during the fallback.
      throw new Error(`The fallback system failed. Reason: ${error.message}`);
    }
  }
);
