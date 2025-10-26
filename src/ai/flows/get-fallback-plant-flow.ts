
'use server';
/**
 * @fileOverview A flow for providing a fallback plant from Firebase Storage when AI generation fails.
 *
 * - getFallbackPlantFlow - A function that returns a random plant image from Storage with a new name/description.
 * - GetFallbackPlantOutput - The return type for the getFallbackPlant function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getStorage, ref, listAll, getBlob } from 'firebase/storage';
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';


const GetFallbackPlantOutputSchema = z.object({
  name: z.string().describe('The creative name of the fallback plant.'),
  description: z.string().describe('A short, whimsical description of the fallback plant.'),
  imageDataUri: z.string().describe("A plant image from storage, as a data URI."),
});

export type GetFallbackPlantOutput = z.infer<typeof GetFallbackPlantOutputSchema>;

// Helper to convert a Blob to a data URI
async function blobToDataUri(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = blob.type || 'image/png';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
}


export const getFallbackPlantFlow = ai.defineFlow(
  {
    name: 'getFallbackPlantFlow',
    outputSchema: GetFallbackPlantOutputSchema,
  },
  async () => {
    try {
      // Use server-side environment variables for Firebase config in a Genkit flow.
      const firebaseConfig: FirebaseOptions = {
          apiKey: process.env.GEMINI_API_KEY, 
          authDomain: process.env.FIREBASE_AUTH_DOMAIN,
          projectId: process.env.FIREBASE_PROJECT_ID,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.FIREBASE_APP_ID,
      };
      
      if (!firebaseConfig.projectId || !firebaseConfig.storageBucket) {
        throw new Error("Server-side Firebase configuration for Storage is missing. Please check your environment variables.");
      }

      // Initialize a unique app instance for the flow to avoid conflicts.
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig, `genkit-fallback-${Date.now()}`);
      const storage = getStorage(app);
      const fallbackDirRef = ref(storage, 'fallback-plants');
      const fileList = await listAll(fallbackDirRef);

      if (fileList.items.length === 0) {
        throw new Error('No fallback images found in Firebase Storage at /fallback-plants/');
      }

      // Select a random image from the list
      const randomFileRef = fileList.items[Math.floor(Math.random() * fileList.items.length)];
      
      // Get the image data directly as a Blob
      const imageBlob = await getBlob(randomFileRef);
      const imageDataUri = await blobToDataUri(imageBlob);

      // Generate a simple, generic name and description without an AI call.
      const names = ["Sturdy Sprout", "Happy Bloom", "Sunny Petal", "Leafy Friend", "Rooty"];
      const descriptions = ["A resilient and cheerful plant.", "It seems to be enjoying the day.", "This one has a lot of personality.", "A classic for any collection."];

      const name = names[Math.floor(Math.random() * names.length)];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];

      return {
        name: name,
        description: description,
        imageDataUri: imageDataUri,
      };

    } catch (error: any) {
      console.error("CRITICAL FALLBACK FAILURE:", error);
      // This is the absolute last resort if Storage or AI fails during the fallback.
      throw new Error(`The fallback system failed. Reason: ${error.message}`);
    }
  }
);
