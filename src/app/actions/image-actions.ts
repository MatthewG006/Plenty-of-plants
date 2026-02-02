'use server';

import { headers } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getApps, initializeApp, getApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


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
    try {
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const storage = getStorage(app);
        const storageRef = ref(storage, `users/${uid}/plants/${plantId}/${Date.now()}.jpg`);

        const base64 = dataUri.split(',')[1];
        if (!base64) {
            throw new Error('Invalid data URI provided for upload.');
        }
        const buffer = Buffer.from(base64, 'base64');

        const snapshot = await uploadBytes(storageRef, buffer, {
            contentType: 'image/jpeg'
        });

        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;

    } catch (error: any) {
        console.error("Error in uploadImageAction:", error);
        throw new Error("Failed to upload image due to a server error.");
    }
}
