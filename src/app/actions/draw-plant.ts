
'use server';

import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { DrawPlantOutput } from '@/interfaces/plant';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function now fetches the image, converts it to a base64 data URI on the server,
// and returns that to the client. This bypasses any client-side CORS issues.
export async function drawPlantAction(existingImageFilenames: string[]): Promise<DrawPlantOutput> {
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const storage = getStorage(app);
    const fallbackPlantsRef = ref(storage, 'fallback-plants');

    const res = await listAll(fallbackPlantsRef);
    const allImageRefs = res.items;

    if (allImageRefs.length === 0) {
      throw new Error('No fallback images found in storage.');
    }
    
    // Filter out images the user already has
    let availableImageRefs = allImageRefs.filter(imageRef => {
        const filename = imageRef.name.split('/').pop() || '';
        return !existingImageFilenames.includes(filename);
    });

    // If the user has all plants, fall back to the full list
    if (availableImageRefs.length === 0) {
        availableImageRefs = allImageRefs;
    }


    const randomFileRef = availableImageRefs[Math.floor(Math.random() * availableImageRefs.length)];
    const imageURL = await getDownloadURL(randomFileRef);

    // Fetch the image data on the server
    const imageResponse = await fetch(imageURL);
    if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const dataUri = `data:${contentType};base64,${imageBase64}`;

    const filename = randomFileRef.name.split('/').pop() || 'unknown';
    const name = filename
        .replace(/\.(png|jpg|jpeg)$/i, '')
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
        
    return {
        name: name,
        description: `A lovely ${name} that just sprouted.`,
        imageDataUri: dataUri,
        // Send the filename so the client can track it
        hint: filename, 
    };

  } catch (error: any) {
    console.error("Error in drawPlantAction:", error);
    // Rethrow a more generic error to the client to avoid exposing server details.
    throw new Error("Failed to get a fallback plant due to a server error.");
  }
}
