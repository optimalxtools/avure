// lib/firebaseClient.ts
'use client'

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
}

// Only attempt to initialize Firebase in the browser when a key is present.
const app =
  typeof window !== 'undefined' && cfg.apiKey
    ? getApps().length
      ? getApp()
      : initializeApp(cfg)
    : undefined

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: any = app ? getAuth(app) : {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any   = app ? getFirestore(app) : {}
