
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyBw-8c7c_p8nQ7zR_s6wV5tY3uL1oX_F4",
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
