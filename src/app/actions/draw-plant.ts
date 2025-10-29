
'use server';

import { getPlantDetails } from '@/ai/flows/get-plant-details-flow';
import type { DrawPlantOutput } from '@/interfaces/plant';
import { getStorage } from 'firebase-admin/storage';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { adminConfig } from '@/lib/firebase-admin-config';

let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp({
    credential: adminConfig,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
} else {
  adminApp = getApps()[0];
}

export async function drawPlantAction(existingNames: string[]): Promise<DrawPlantOutput> {
  try {
    const storage = getStorage(adminApp);
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: 'fallback-plants/' });

    const imageFiles = files.filter(file => !file.name.endsWith('/'));

    if (imageFiles.length === 0) {
      throw new Error('No fallback images found in storage. Make sure you have uploaded images to the /fallback-plants directory in your Firebase Storage bucket.');
    }

    const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    
    const [fileContents] = await randomFile.download();
    const mimeType = randomFile.metadata.contentType || 'image/png';
    const imageDataUri = `data:${mimeType};base64,${fileContents.toString('base64')}`;

    const { name, description } = await getPlantDetails({ existingNames });

    return {
      name,
      description,
      imageDataUri,
    };
  } catch (error: any) {
    console.error("Error in drawPlantAction:", error);
    // Provide a hardcoded fallback in case of any server-side error
    return {
        name: "Failsafe Fern",
        description: "A resilient plant that appears when things go wrong.",
        imageDataUri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    }
  }
}
