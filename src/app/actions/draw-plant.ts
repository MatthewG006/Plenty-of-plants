
'use server';

import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { adminConfig } from '@/lib/firebase-admin-config';
import type { DrawPlantOutput } from '@/interfaces/plant';

// This is the only exported function, as required for Server Actions.
export async function drawPlantAction(existingNames: string[]): Promise<DrawPlantOutput> {
  // Logic from the old getFirebaseAdminApp is now directly inside the async function.
  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert(adminConfig),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });

  if (!app) {
    throw new Error("Firebase Admin SDK not initialized. Check server configuration.");
  }
  
  try {
    const storage = getStorage(app);
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: 'fallback-plants/' });
    
    const imageFiles = files.filter(file => !file.name.endsWith('/'));

    if (imageFiles.length === 0) {
        throw new Error('No fallback images found in storage.');
    }

    const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    
    const [fileBuffer] = await randomFile.download();
    
    const fileExtension = randomFile.name.split('.').pop()?.toLowerCase();
    let mimeType = 'image/png';
    if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
        mimeType = 'image/jpeg';
    }
    
    const imageDataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    const filename = randomFile.name.split('/').pop() || 'unknown';
    const name = filename
        .replace(/\.(png|jpg|jpeg)$/i, '')
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
        
    return {
        name: name,
        description: `A lovely ${name} that just sprouted.`,
        imageDataUri: imageDataUri,
    };

  } catch (error: any) {
    console.error("Error in drawPlantAction:", error);
    throw new Error("Failed to draw a plant due to a server error.");
  }
}
