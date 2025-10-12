
'use server';
/**
 * @fileOverview An action for drawing a new plant from a predefined set in Firebase Storage.
 */

import { getStorage, ref, listAll, getBlob } from 'firebase/storage';
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import type { DrawPlantOutput } from '@/ai/flows/draw-plant-flow';

// Helper to convert a Blob to a Base64 data URI
async function blobToDataUri(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return `data:${blob.type};base64,${buffer.toString('base64')}`;
}

export async function drawFromStorageAction(
  existingNames: string[] = []
): Promise<DrawPlantOutput> {
  try {
    const firebaseConfig: FirebaseOptions = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const storage = getStorage(app);
    const fallbackDirRef = ref(storage, 'fallback-plants');
    const fileList = await listAll(fallbackDirRef);

    if (fileList.items.length === 0) {
      throw new Error(
        'No fallback images found in Firebase Storage at /fallback-plants/'
      );
    }

    // Select a random image reference from the list
    const randomFileRef =
      fileList.items[Math.floor(Math.random() * fileList.items.length)];
    
    // Get the image data directly as a blob
    const imageBlob = await getBlob(randomFileRef);
    
    // Convert the blob to a data URI
    const imageDataUri = await blobToDataUri(imageBlob);

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
    // This is the crucial change: throw the error so the client can catch it.
    throw new Error('There was an issue with Firebase Storage.');
  }
}
