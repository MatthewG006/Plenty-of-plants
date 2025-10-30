
'use server';

import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { adminConfig } from '@/lib/firebase-admin-config';
import type { DrawPlantOutput } from '@/interfaces/plant';

function getFirebaseAdminApp() {
    if (getApps().length > 0) {
        return getApp();
    }
    
    // Check if the required config values are present, otherwise log a warning and return.
    if (!adminConfig.projectId || !adminConfig.clientEmail || !adminConfig.privateKey) {
        console.warn("Firebase Admin config is missing. Server-side features will not work.");
        return null;
    }

    return initializeApp({
        credential: cert(adminConfig),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
}

// This server action is now fully responsible for getting ALL plant data,
// including the image, to avoid client-side CORS issues.
export async function drawPlantAction(existingNames: string[]): Promise<DrawPlantOutput> {
  const app = getFirebaseAdminApp();
  if (!app) {
    throw new Error("Firebase Admin SDK not initialized. Check server configuration.");
  }
  
  try {
    const storage = getStorage(app);
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: 'fallback-plants/' });
    
    // Filter out the directory itself
    const imageFiles = files.filter(file => !file.name.endsWith('/'));

    if (imageFiles.length === 0) {
        throw new Error('No fallback images found in storage.');
    }

    const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    
    // Download the file into a buffer
    const [fileBuffer] = await randomFile.download();
    
    // Determine MIME type from filename
    const fileExtension = randomFile.name.split('.').pop()?.toLowerCase();
    let mimeType = 'image/png'; // Default
    if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
        mimeType = 'image/jpeg';
    }
    
    // Convert to data URI
    const imageDataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    // Derive name and description from filename to avoid AI errors
    const filename = randomFile.name.split('/').pop() || 'unknown';
    const name = filename
        .replace(/\.(png|jpg|jpeg)$/i, '') // remove extension
        .replace(/[-_]/g, ' ') // replace hyphens/underscores with spaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // capitalize
        .join(' ');
        
    return {
        name: name,
        description: `A lovely ${name} that just sprouted.`,
        imageDataUri: imageDataUri,
    };

  } catch (error: any) {
    console.error("Error in drawPlantAction:", error);
    // Provide a hardcoded fallback in case of catastrophic failure
    return {
      name: 'Brave Little Sprout',
      description: 'A resilient sprout that appeared despite a server error.',
      imageDataUri: '/fern.png', // A local public image
    }
  }
}
