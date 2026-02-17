import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyC1f7_1tL5qP7mN4sK9jH8gF6dE2cZ_xY",
  authDomain: "plentyofplants-108e8.firebaseapp.com",
  projectId: "plentyofplants-108e8",
  storageBucket: "plentyofplants-108e8.appspot.com",
  messagingSenderId: "317861154450",
  appId: "1:317861154450:web:3a586f3cc5b1c42e64e04b",
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
