// lib/firebase.ts
'use client';

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // ok even if unused
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
}

// Only initialize Firebase in the browser when a key is available. During
// server-side rendering or when env vars are absent we skip initialization to
// avoid "auth/invalid-api-key" errors.
const app =
  typeof window !== 'undefined' && config.apiKey
    ? getApps().length
      ? getApp()
      : initializeApp(config)
    : undefined

// IMPORTANT: pass the app to getAuth()
// When `app` is undefined we export `undefined` which is safe on the server
// because Firebase APIs are only accessed within `useEffect` on the client.
// Cast fallbacks to `any` to satisfy TypeScript; these are only used on the
// client where `app` will be defined.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: any = app ? getAuth(app) : {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = app ? getFirestore(app) : {}
