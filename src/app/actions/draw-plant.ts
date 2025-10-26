
'use server';

import * as admin from 'firebase-admin';
import { DrawPlantOutputSchema, type DrawPlantOutput } from '@/interfaces/plant';

// Helper to initialize Firebase Admin SDK safely
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Check if the necessary environment variables are set.
  // These are automatically populated in the App Hosting environment.
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_STORAGE_BUCKET) {
    throw new Error('Firebase Admin SDK environment variables are not set.');
  }

  return admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

/**
 * This server action uses the Firebase Admin SDK to securely access
 * Firebase Storage from the server-side. It fetches a random image
 * from the 'fallback-plants' directory and returns it as a data URI.
 */
export async function drawPlantAction(existingNames: string[] = []): Promise<DrawPlantOutput> {
  try {
    const app = initializeFirebaseAdmin();
    const storage = app.storage();
    const bucket = storage.bucket();

    const [files] = await bucket.getFiles({ prefix: 'fallback-plants/' });
    
    // Filter out the directory itself
    const imageFiles = files.filter(file => !file.name.endsWith('/'));
    
    if (imageFiles.length === 0) {
      throw new Error('No fallback images found in Firebase Storage at /fallback-plants/');
    }

    const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    
    // Download the file content into a buffer
    const [fileBuffer] = await randomFile.download();
    
    // Determine MIME type from file extension
    const extension = randomFile.name.split('.').pop()?.toLowerCase() || 'png';
    const contentType = `image/${extension}`;

    // Convert the buffer to a Base64 data URI
    const imageDataUri = `data:${contentType};base64,${fileBuffer.toString('base64')}`;

    // Generate a simple, generic name and description
    const names = ["Sturdy Sprout", "Happy Bloom", "Sunny Petal", "Leafy Friend", "Rooty"];
    const descriptions = ["A resilient and cheerful plant.", "It seems to be enjoying the day.", "This one has a lot of personality.", "A classic for any collection."];

    const name = names[Math.floor(Math.random() * names.length)];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];

    const result = {
      name,
      description,
      imageDataUri,
    };
    
    // Validate the output against the schema before returning
    DrawPlantOutputSchema.parse(result);

    return result;

  } catch (error: any) {
    console.error("CRITICAL DRAW FAILURE in Server Action:", error);
    // This will be caught by the client and trigger the error toast.
    throw new Error(`The drawing system failed. Reason: ${error.message}`);
  }
}
