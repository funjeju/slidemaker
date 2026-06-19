"use client";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy init so build-time prerender (no env vars) never executes getAuth().
let _app: FirebaseApp | null = null;
function app(): FirebaseApp {
  if (!_app) _app = getApps().length ? getApp() : initializeApp(config);
  return _app;
}

export function getAuthClient(): Auth {
  return getAuth(app());
}
export function getDbClient(): Firestore {
  return getFirestore(app());
}
export const googleProvider = new GoogleAuthProvider();
