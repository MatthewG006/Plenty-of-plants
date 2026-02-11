
'use server';

import { headers } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // When GOOGLE_APPLICATION_CREDENTIALS is set in the environment,
    // initializeApp() automatically uses it for authentication.
    admin.initializeApp({
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error: any) {
    console.error(
        "CRITICAL: Firebase Admin SDK initialization failed. This can happen if the GOOGLE_APPLICATION_CREDENTIALS environment variable is not set correctly. Server-side features like image uploads will fail.",
        error
    );
  }
}

export async function getImageDataUriAction(imageUrl: string): Promise<string> {
  try {
    let imageBuffer: ArrayBuffer;
    let contentType: string;

    // Check if the imageUrl is a relative path to a local file
    if (imageUrl.startsWith('/')) {
        const filePath = path.join(process.cwd(), 'public', imageUrl);
        const fileBuffer = await fs.readFile(filePath);
        imageBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);

        const extension = path.extname(filePath).toLowerCase();
        switch (extension) {
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
            case '.gif':
                contentType = 'image/gif';
                break;
            default:
                contentType = 'application/octet-stream';
        }
    } else {
        // Otherwise, treat it as a full URL
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image from ${imageUrl}: ${imageResponse.statusText}`);
        }
        imageBuffer = await imageResponse.arrayBuffer();
        contentType = imageResponse.headers.get('content-type') || 'image/png';
    }

    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const dataUri = `data:${contentType};base64,${imageBase64}`;

    return dataUri;

  } catch (error: any) {
    console.error("Error in getImageDataUriAction:", error);
    // Rethrow a more generic error to the client to avoid exposing server details.
    throw new Error("Failed to get image data URI due to a server error.");
  }
}

export async function uploadImageAction(uid: string, plantId: number, dataUri: string): Promise<string> {
    if (admin.apps.length === 0) {
      throw new Error("Cannot upload image: Firebase Admin SDK is not initialized. Ensure GOOGLE_APPLICATION_CREDENTIALS is set in your environment.");
    }
    try {
        const bucket = admin.storage().bucket();
        const filePath = `users/${uid}/plants/${plantId}/${Date.now()}.jpg`;
        const file = bucket.file(filePath);

        const base64 = dataUri.split(',')[1];
        if (!base64) {
            throw new Error('Invalid data URI provided for upload.');
        }
        const buffer = Buffer.from(base64, 'base64');

        await file.save(buffer, {
            metadata: {
                contentType: 'image/jpeg'
            }
        });

        const [downloadURL] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491' // A long time in the future
        });

        return downloadURL;

    } catch (error: any) {
        console.error("Error in uploadImageAction:", error);
        throw new Error("Failed to upload image due to a server error.");
    }
}
