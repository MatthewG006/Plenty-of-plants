
'use client';
/**
 * @fileOverview A client-side flow for providing a fallback plant from Firebase Storage.
 *
 * This flow runs in the client environment to ensure it has access to the
 * authenticated user's context for Firebase Storage access.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getStorage, ref, listAll, getBlob } from 'firebase/storage';
import { app } from '@/lib/firebase'; // Use the initialized client-side Firebase app
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
    inputSchema: z.array(z.string()),
    outputSchema: DrawPlantOutputSchema,
  },
  async () => {
    try {
      const storage = getStorage(app);
      const fallbackDirRef = ref(storage, 'fallback-plants');
      const fileList = await listAll(fallbackDirRef);

      if (fileList.items.length === 0) {
        throw new Error('No fallback images found in Firebase Storage at /fallback-plants/.');
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

      const result: DrawPlantOutput = {
        name: name,
        description: description,
        imageDataUri: imageDataUri,
      };

      // Validate the output before returning
      DrawPlantOutputSchema.parse(result);

      return result;

    } catch (error: any) {
      console.error("CRITICAL DRAW FAILURE:", error);
      // This will be caught by the client and trigger the error toast.
      throw new Error(`The drawing system failed. Reason: ${error.message}`);
    }
  }
);
