
'use server';
/**
 * @fileOverview An action for drawing a new plant from a predefined set in Firebase Storage.
 */

import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase';
import type { DrawPlantOutput } from '@/ai/flows/draw-plant-flow';

// Helper to fetch an image and convert it to a data URI
async function imageToDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const blob = await response.blob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  return `data:${blob.type};base64,${buffer.toString('base64')}`;
}

export async function drawFromStorageAction(
  existingNames: string[] = []
): Promise<DrawPlantOutput> {
  try {
    const storage = getStorage(app);
    const fallbackDirRef = ref(storage, 'fallback-plants');
    const fileList = await listAll(fallbackDirRef);

    if (fileList.items.length === 0) {
      throw new Error(
        'No fallback images found in Firebase Storage at /fallback-plants/'
      );
    }

    // Select a random image from the list
    const randomFileRef =
      fileList.items[Math.floor(Math.random() * fileList.items.length)];
    const downloadUrl = await getDownloadURL(randomFileRef);
    const imageDataUri = await imageToDataUri(downloadUrl);

    // Generate a simple, non-AI name and description
    const plantNames = [
      'Happy Sprout',
      'Sunny Petal',
      'Jolly Leaf',
      'Gleeful Bud',
      'Chipper Root',
    ];
    let newName = plantNames[Math.floor(Math.random() * plantNames.length)];

    // Ensure the name is unique if possible
    let attempt = 0;
    while(existingNames.includes(newName) && attempt < 5) {
        newName = `${newName} ${attempt + 2}`;
        attempt++;
    }

    return {
      name: newName,
      description: 'A cheerful new plant friend from the fallback collection.',
      imageDataUri: imageDataUri,
    };
  } catch (error: any) {
    console.error('CRITICAL FALLBACK FAILURE:', error);
    // This is the absolute last resort if Storage fails.
    // This ensures the app doesn't crash.
    return {
      name: 'Sturdy Sprout',
      description: 'A very resilient little sprout.',
      imageDataUri:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    };
  }
}
