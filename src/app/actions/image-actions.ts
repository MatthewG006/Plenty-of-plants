'use server';

import { headers } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });
}

export async function getImageDataUriAction(imageUrl: string): Promise<string> {
  try {
    let imageBuffer: Buffer;
    let contentType: string;

    const firebaseStoragePattern = /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/;
    const match = imageUrl.match(firebaseStoragePattern);

    if (match && match[1]) {
        // It's a Firebase Storage URL, use Admin SDK
        const filePath = decodeURIComponent(match[1]);
        const bucket = admin.storage().bucket();
        const file = bucket.file(filePath);
        
        try {
            const [data] = await file.download();
            imageBuffer = data;
            const [metadata] = await file.getMetadata();
            contentType = metadata.contentType || 'image/png';
        } catch (sdkError) {
            console.error(`Firebase Admin SDK failed to download ${filePath}. Falling back to fetch.`, sdkError);
            // Fallback to fetch if SDK fails
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image from ${imageUrl}: ${imageResponse.statusText}`);
            }
            const arrayBuffer = await imageResponse.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
            contentType = imageResponse.headers.get('content-type') || 'image/png';
        }
    } else if (imageUrl.startsWith('/')) {
        // It's a local file
        const filePath = path.join(process.cwd(), 'public', imageUrl);
        imageBuffer = await fs.readFile(filePath);
        const extension = path.extname(filePath).toLowerCase();
        switch (extension) {
            case '.png': contentType = 'image/png'; break;
            case '.jpg':
            case '.jpeg': contentType = 'image/jpeg'; break;
            case '.gif': contentType = 'image/gif'; break;
            default: contentType = 'application/octet-stream';
        }
    } else {
        // It's some other external URL, use fetch
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image from ${imageUrl}: ${imageResponse.statusText}`);
        }
        const arrayBuffer = await imageResponse.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        contentType = imageResponse.headers.get('content-type') || 'image/png';
    }

    const imageBase64 = imageBuffer.toString('base64');
    const dataUri = `data:${contentType};base64,${imageBase64}`;

    return dataUri;

  } catch (error: any) {
    console.error("Error in getImageDataUriAction:", error);
    throw new Error(`Failed to get image data URI due to a server error: ${error.message}`);
  }
}


export async function uploadImageAction(uid: string, plantId: number, dataUri: string): Promise<string> {
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
