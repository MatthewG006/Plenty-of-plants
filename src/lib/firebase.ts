import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// IMPORTANT: Replace the placeholder values with your own Firebase project configuration.
// You can find this in your Firebase project settings.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "PASTE_YOUR_API_KEY_HERE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "PASTE_YOUR_APP_ID_HERE",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
