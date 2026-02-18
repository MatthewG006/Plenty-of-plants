'use client';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

type FirebaseInstances = {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
};

let firebaseInstances: FirebaseInstances | null = null;

export const initializeFirebase = (): FirebaseInstances => {
    if (firebaseInstances) {
        return firebaseInstances;
    }

    if (!firebaseConfig.apiKey) {
        throw new Error("Missing Firebase API Key. Please make sure NEXT_PUBLIC_FIREBASE_API_KEY is set in your .env.local file.");
    }

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    firebaseInstances = { app, auth, db };
    return firebaseInstances;
};

// Export instances for use where hooks can't be used.
const { app, auth, db } = initializeFirebase();
export { app, auth, db };


// Export hooks and providers for component use.
export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore } from './provider';
export { useUser } from './auth/use-user';
