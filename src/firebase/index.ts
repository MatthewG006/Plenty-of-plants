
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const getClientApp = (): FirebaseApp => {
    if (getApps().length) {
        return getApp();
    }
    
    if (!firebaseConfig.apiKey) {
        throw new Error('Firebase API key is not available. Check your environment variables.');
    }

    return initializeApp(firebaseConfig);
};

// Export functions that will be used to get the Firebase services.
// This ensures that getClientApp() is only called when a service is needed.
export const getDb = (): Firestore => getFirestore(getClientApp());
export const getAuth = (): Auth => getAuth(getClientApp());
export const getAnalyticsInstance = (): Promise<Analytics | null> => {
    if (typeof window !== 'undefined') {
        return isSupported().then(yes => yes ? getAnalytics(getClientApp()) : null);
    }
    return Promise.resolve(null);
};
