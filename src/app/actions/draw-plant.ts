
'use server';

import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { adminConfig } from '@/lib/firebase-admin-config';

function getFirebaseAdminApp() {
    if (getApps().length) {
        return getApp();
    }
    
    // Check if the required config values are present.
    if (!adminConfig.projectId || !adminConfig.clientEmail || !adminConfig.privateKey) {
        if (process.env.NODE_ENV === 'development') {
            // In dev mode, it's okay for these not to be set.
            // We can throw a clearer error.
            throw new Error(
                `Firebase Admin environment variables are not set.
                 Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.
                 This is expected for client-side only development, but this server action requires them.`
            );
        }
        // In production, this should be a hard failure.
        throw new Error('Firebase Admin environment variables are not set.');
    }

    return initializeApp({
        credential: cert(adminConfig),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
}


// This server action is now the single source of truth for drawing a plant.
// It fetches the image from storage and derives the name/description from the filename.
// This avoids all client-side CORS issues and AI model dependency errors.
export async function drawPlantAction(existingNames: string[]): Promise<{ name: string, description: string, imageDataUri: string, hint: string }> {
  try {
    const app = getFirebaseAdminApp();
    const storage = getStorage(app);
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: 'fallback-plants/' });

    const imageFiles = files.filter(file => !file.name.endsWith('/'));

    if (imageFiles.length === 0) {
      throw new Error("No fallback plant images found in storage.");
    }

    const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    const [fileBuffer] = await randomFile.download();
    
    const mimeType = randomFile.metadata.contentType || 'image/png';
    const imageDataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    // Derive name and description from filename
    const fileName = randomFile.name.split('/').pop()?.split('.')[0] || 'new-plant';
    const name = fileName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const description = "A new friend has joined your collection!";
    
    return { 
        name, 
        description, 
        imageDataUri,
        hint: name.toLowerCase().split(' ').slice(0, 2).join(' ') 
    };

  } catch (error: any) {
    console.error("Error in drawPlantAction:", error);
    // Rethrow the error so the client knows something went wrong.
    throw new Error(`Failed to draw a new plant: ${error.message}`);
  }
}

