
'use server';

import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { DrawPlantOutput } from '@/interfaces/plant';

// IMPORTANT: This configuration is for the CLIENT-SIDE SDK, not the Admin SDK.
// It is safe to use in server components/actions when interacting with client-side services.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function now uses the standard Firebase JS SDK, not the Admin SDK.
// It fetches a public URL for a random fallback image.
export async function drawPlantAction(existingNames: string[]): Promise<DrawPlantOutput> {
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const storage = getStorage(app);
    const fallbackPlantsRef = ref(storage, 'fallback-plants');

    const res = await listAll(fallbackPlantsRef);
    const imageRefs = res.items;

    if (imageRefs.length === 0) {
      throw new Error('No fallback images found in storage.');
    }

    const randomFileRef = imageRefs[Math.floor(Math.random() * imageRefs.length)];
    const imageURL = await getDownloadURL(randomFileRef);

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
        imageDataUri: imageURL,
    };

  } catch (error: any) {
    console.error("Error in drawPlantAction:", error);
    throw new Error("Failed to get a fallback plant due to a server error.");
  }
}
