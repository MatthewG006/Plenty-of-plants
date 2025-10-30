
'use server';

import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import type { DrawPlantOutput } from '@/interfaces/plant';

// This is the only exported function, as required for Server Actions.
export async function drawPlantAction(existingNames: string[]): Promise<DrawPlantOutput> {
  
  // Define the config directly inside the function using process.env
  const adminConfig = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!adminConfig.project_id || !adminConfig.client_email || !adminConfig.private_key) {
    throw new Error('Firebase Admin environment variables are not set. Check your .env.local file.');
  }

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
