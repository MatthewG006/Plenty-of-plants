
'use server';

import { getPlantDetails } from '@/ai/flows/get-plant-details-flow';
import type { DrawPlantOutput } from '@/interfaces/plant';
import { getStorage } from 'firebase-admin/storage';
import { initializeApp, getApps, App, type ServiceAccount } from 'firebase-admin/app';
import { adminConfig } from '@/lib/firebase-admin-config';

// This function initializes and returns the Firebase Admin App instance,
// handling both initial creation and subsequent retrievals.
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  
  // Ensure that the service account has all the required properties.
  // This is a type guard to satisfy TypeScript.
  const serviceAccount: ServiceAccount = {
    projectId: adminConfig.projectId,
    clientEmail: adminConfig.clientEmail,
    privateKey: adminConfig.privateKey,
  };

  return initializeApp({
    credential: {
      projectId: serviceAccount.projectId,
      clientEmail: serviceAccount.clientEmail,
      privateKey: serviceAccount.privateKey,
    },
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}


export async function drawPlantAction(existingNames: string[]): Promise<DrawPlantOutput> {
  try {
    const adminApp = getAdminApp();
    const storage = getStorage(adminApp);
    const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    
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
        hint: 'fern',
    }
  }
}
