
'use server';
/**
 * @fileOverview A flow for providing a fallback plant from Firebase Storage when AI generation fails.
 *
 * - getFallbackPlantFlow - A function that returns a random plant image from Storage with a new name/description.
 * - GetFallbackPlantOutput - The return type for the getFallbackPlant function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';


const GetFallbackPlantOutputSchema = z.object({
  name: z.string().describe('The creative name of the fallback plant.'),
  description: z.string().describe('A short, whimsical description of the fallback plant.'),
  imageDataUri: z.string().describe("A plant image from storage, as a data URI."),
});

export type GetFallbackPlantOutput = z.infer<typeof GetFallbackPlantOutputSchema>;

// Helper to download an image from a URL and convert it to a data URI
async function imageToDataUri(url: string): Promise<string> {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
}


export const getFallbackPlantFlow = ai.defineFlow(
  {
    name: 'getFallbackPlantFlow',
    outputSchema: GetFallbackPlantOutputSchema,
  },
  async () => {
    try {
      // Use NEXT_PUBLIC_ prefixed variables, as defined in the user's .env file
      const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.replace('gs://', '');

      const firebaseConfig: FirebaseOptions = {
          apiKey: process.env.GEMINI_API_KEY, // Genkit auth for Firebase services on the server
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: storageBucket,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
      
      if (!firebaseConfig.projectId || !firebaseConfig.storageBucket) {
        throw new Error("Server-side Firebase configuration for Storage is missing. Check environment variables.");
      }

      // Initialize a unique app instance for the flow to avoid conflicts.
      const appName = `genkit-fallback-${Date.now()}`;
      const app = getApps().find(a => a.name === appName) || initializeApp(firebaseConfig, appName);
      const storage = getStorage(app);
      const fallbackDirRef = ref(storage, 'fallback-plants');
      const fileList = await listAll(fallbackDirRef);

      if (fileList.items.length === 0) {
        throw new Error('No fallback images found in Firebase Storage at /fallback-plants/');
      }

      // Select a random image from the list
      const randomFileRef = fileList.items[Math.floor(Math.random() * fileList.items.length)];
      
      // Get a download URL and then fetch the data
      const downloadUrl = await getDownloadURL(randomFileRef);
      const imageDataUri = await imageToDataUri(downloadUrl);

      // Generate a simple, generic name and description without an AI call.
      const names = ["Sturdy Sprout", "Happy Bloom", "Sunny Petal", "Leafy Friend", "Rooty"];
      const descriptions = ["A resilient and cheerful plant.", "It seems to be enjoying the day.", "This one has a lot of personality.", "A classic for any collection."];

      const name = names[Math.floor(Math.random() * names.length)];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];

      return {
        name: String(name),
        description: String(description),
        imageDataUri: imageDataUri,
      };

    } catch (error: any) {
      console.error("CRITICAL FALLBACK FAILURE:", error);
      // This is the absolute last resort if Storage or AI fails during the fallback.
      throw new Error(`The fallback system failed. Reason: ${error.message}`);
    }
  }
);
