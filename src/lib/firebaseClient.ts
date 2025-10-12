// lib/firebaseClient.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = { /* your config from console */ };

if (!getApps().length) initializeApp(firebaseConfig);

export const auth = getAuth();
export const db = getFirestore();
