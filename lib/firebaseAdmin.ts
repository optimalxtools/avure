// lib/firebaseAdmin.ts
import 'server-only';

import { getApps, getApp, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/** Create/return an Admin app in *this* process, then pass it explicitly. */
function ensureAdminApp(): App {
  if (getApps().length) return getApp();
  try {
    return initializeApp(); // on Firebase Hosting/Cloud Run this picks up injected creds
  } catch {
    return initializeApp({ credential: applicationDefault() }); // local ADC fallback
  }
}

export function getAdminAuth(): Auth {
  const app = ensureAdminApp();   // <- guaranteed in this process
  return getAuth(app);            // <- pass the app (no reliance on "default")
}

export function getAdminDb(): Firestore {
  const app = ensureAdminApp();   // <- guaranteed in this process
  return getFirestore(app);       // <- use Firestore with the named app
}
