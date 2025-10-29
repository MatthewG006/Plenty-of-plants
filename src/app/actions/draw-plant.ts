
'use server';

import { getPlantDetails } from '@/ai/flows/get-plant-details-flow';
import type { DrawPlantOutput, GetPlantDetailsInput } from '@/interfaces/plant';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { adminConfig } from '@/lib/firebase-admin-config';

// Initialize Firebase Admin SDK
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  
  // In a Vercel/production environment, you would use secrets.
  // For this local setup, we use the config file.
  return initializeApp({
    credential: cert(adminConfig),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}


// This server action is now fully responsible for drawing a new plant.
// It fetches a random image from Storage, converts it to a data URI,
// and gets a name/description from the AI.
export async function drawPlantAction(input: GetPlantDetailsInput): Promise<DrawPlantOutput> {
  try {
    const adminApp = getAdminApp();
    const storage = getStorage(adminApp);
    const bucket = storage.bucket();

    const [files] = await bucket.getFiles({ prefix: 'fallback-plants/' });
    
    // Filter out the directory itself if it appears in the list
    const imageFiles = files.filter(file => !file.name.endsWith('/'));

    if (imageFiles.length === 0) {
      throw new Error("No images found in the fallback-plants directory.");
    }
    
    const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];

    const [fileBuffer] = await randomFile.download();
    const mimeType = randomFile.metadata.contentType || 'image/png';
    const imageDataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    const { name, description } = await getPlantDetails(input);

    return { name, description, imageDataUri };

  } catch (error: any) {
    console.error("Error in drawPlantAction:", error);
    // Provide a hardcoded fallback in case of any server-side error
    return {
        name: "Failsafe Fern",
        description: "A resilient plant that appears when things go wrong.",
        imageDataUri: "/fern.png", // Use a local public image for the failsafe
        hint: 'fern',
    }
  }
}

// This action is no longer needed as the logic is consolidated above.
export async function getPlantDetailsAction(input: GetPlantDetailsInput): Promise<Omit<DrawPlantOutput, 'imageDataUri'>> {
  throw new Error("getPlantDetailsAction is deprecated. Use drawPlantAction instead.");
}
