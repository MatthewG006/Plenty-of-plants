
'use client';
/**
 * @fileOverview A flow for providing a fallback plant from Firebase Storage.
 *
 * - drawPlantFlow - A function that returns a random plant image from Storage with a new name/description.
 * - DrawPlantOutput - The return type for the drawPlant function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getStorage, ref, listAll, getBlob } from 'firebase/storage';
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { DrawPlantOutputSchema, type DrawPlantOutput } from '@/interfaces/plant';


// Helper to convert a Blob to a data URI
async function blobToDataUri(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = blob.type || 'image/png';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
}


export const drawPlantFlow = ai.defineFlow(
  {
    name: 'drawPlantFlow',
    inputSchema: z.any(),
    outputSchema: DrawPlantOutputSchema,
  },
  async () => {
    try {
      const firebaseConfig: FirebaseOptions = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
      
      if (!firebaseConfig.projectId || !firebaseConfig.storageBucket) {
        throw new Error("Client-side Firebase configuration for Storage is missing.");
      }

      // Initialize a unique app instance for the flow to avoid conflicts.
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const storage = getStorage(app);
      const fallbackDirRef = ref(storage, 'fallback-plants');
      const fileList = await listAll(fallbackDirRef);

      if (fileList.items.length === 0) {
        throw new Error('No fallback images found in Firebase Storage at /fallback-plants/');
      }

      // Select a random image from the list
      const randomFileRef = fileList.items[Math.floor(Math.random() * fileList.items.length)];
      
      const imageBlob = await getBlob(randomFileRef);
      const imageDataUri = await blobToDataUri(imageBlob);

      // Generate a simple, generic name and description.
      const names = ["Sturdy Sprout", "Happy Bloom", "Sunny Petal", "Leafy Friend", "Rooty"];
      const descriptions = ["A resilient and cheerful plant.", "It seems to be enjoying the day.", "This one has a lot of personality.", "A classic for any collection."];

      const name = names[Math.floor(Math.random() * names.length)];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];

      return {
        name: name,
        description: description,
        imageDataUri: imageDataUri,
        hint: name.toLowerCase().split(' ').slice(0, 2).join(' '),
      };

    } catch (error: any) {
      console.error("Fallback plant flow failed:", error);
      throw new Error(`The fallback system failed. Reason: ${error.message}`);
    }
  }
);
