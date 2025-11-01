
'use server';

import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import type { DrawPlantOutput } from '@/interfaces/plant';

// This is the only exported function, as required for Server Actions.
export async function drawPlantAction(existingNames: string[]): Promise<DrawPlantOutput> {
  
  // Define the config directly inside the function using a template literal for the key
  const adminConfig = {
    project_id: "plentyofplants-108e8",
    client_email: "firebase-adminsdk-g31c1@plentyofplants-108e8.iam.gserviceaccount.com",
    private_key: `-----BEGIN PRIVATE KEY-----\nMIICeAIBADANBgkqhkiG9w0BAQEFAASCAmIwggJeAgEAAoGBAN0k+7A5/jybOQQm\n0P9J0GprslqNnMzYfLw+kLw/gxpBu5eon+h9395d8sZgqsNCYyU3AAYK4e1a0n1q\n/x0tggcKDNzj3f5s5g2P7F5c3gK6y9lAmJoqGkLwY3cvbS454f7a7j+DBon0QGqA\ngCiI+5vds6j+r8uYCM43Yy0gTfHlAgMBAAECgYEAqL9jBv9Q2YyG/L6XADyW5H/C\n4p1fUvV1K3L5l5sP/8wYxK2y6KVU/bNTVgR+R43dkh32fQ+lD7M0t+n//isB/+aF\nLwVjF0i4kADsox2I92PjHOSD21l47WfKbyAof9yR5P736k3QGf6m1bjs2D3u/19w\n7f4vQ1hACnEWmUv2gEECQQDy8R3V/2kHjGzQDQjKzR1y2iS1x/eWz/i7a3ZtA/2p\nM6yV5lT9/0N3+x79x/uG3U/5M/zP7wZ/kY6Z8Q7N9A9xAkEA6/0D5e/2e9b9j8c2\ng8c3j2D+o9b8z/i/k7e9w/t9X/y+y3v/s7D/a3v5s/z/y8x/t/v/y9v3/0f7e9z+\nr8tAgECQQC5Z/T9X/y+x3v/s7D/a3v5s/z/y8x/t/v/y9v3/0f7e9z+r8tAgECQQ\nC5Z/T9X/y+x3v/s7D/a3v5s/z/y8x/t/v/y9v3/0f7e9z+r8tAgECQQC5Z/T9X/\ny+x3v/s7D/a3v5s/z/y8x/t/v/y9v3/0f7e9z+r8tAgEC\n-----END PRIVATE KEY-----\n`,
  };

  const app = getApps().length
    ? getApp("[DEFAULT]")
    : initializeApp({
        credential: cert(adminConfig),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'plentyofplants-108e8.appspot.com',
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
