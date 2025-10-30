
'use server';

import { getPlantDetails } from '@/ai/flows/get-plant-details-flow';
import type { DrawPlantOutput, GetPlantDetailsInput } from '@/interfaces/plant';
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { adminConfig } from '@/lib/firebase-admin-config';

// Initialize Firebase Admin SDK
// This pattern ensures that the app is initialized only once.
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(adminConfig),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (e) {
    console.error('Firebase Admin SDK initialization error', e);
  }
}


export async function drawPlantAction(input: GetPlantDetailsInput): Promise<DrawPlantOutput> {
  // Get plant name and description from AI
  const { name, description } = await getPlantDetails(input);

  // Get a random fallback image from Firebase Storage
  const storage = getStorage();
  const bucket = storage.bucket();
  const [files] = await bucket.getFiles({ prefix: 'fallback-plants/' });

  // Filter out directory placeholders
  const imageFiles = files.filter(file => !file.name.endsWith('/'));
  
  if (imageFiles.length === 0) {
      throw new Error("No fallback images found in Firebase Storage.");
  }
  
  const randomItem = imageFiles[Math.floor(Math.random() * imageFiles.length)];
  
  // Download the image as a buffer
  const [imageBuffer] = await randomItem.download();
  
  // Determine MIME type from file extension
  const extension = randomItem.name.split('.').pop()?.toLowerCase() || 'png';
  const mimeType = `image/${extension}`;

  // Convert buffer to data URI
  const imageDataUri = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

  return { 
      name, 
      description, 
      imageDataUri, 
      hint: name.toLowerCase().split(' ').slice(0, 2).join(' ') 
  };
}
