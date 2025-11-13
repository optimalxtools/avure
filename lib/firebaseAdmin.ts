// lib/firebaseAdmin.ts
import 'server-only';

import { getApps, initializeApp, cert, applicationDefault, type App, type AppOptions } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const DEFAULT_APP_NAME = '[DEFAULT]';

function findDefaultApp(): App | undefined {
  return getApps().find(app => app.name === DEFAULT_APP_NAME);
}

function tryInitializeDefault(options?: AppOptions): App {
  try {
    return options ? initializeApp(options) : initializeApp();
  } catch (err) {
    const duplicate = typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'app/duplicate-app';
    if (duplicate) {
      const existing = findDefaultApp();
      if (existing) return existing;
    }
    throw err;
  }
}

/** Create/return an Admin app in *this* process, then pass it explicitly. */
function ensureAdminApp(): App {
  const existing = findDefaultApp();
  if (existing) return existing;

  try {
    return tryInitializeDefault();
  } catch (err) {
    console.warn('[firebaseAdmin] initializeApp() without args failed, falling back', err);
  }

  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (raw) {
    try {
      const key = JSON.parse(raw) as Record<string, unknown>;
      if (typeof key.private_key === 'string') {
        key.private_key = key.private_key.replace(/\\n/g, '\n');
      }
      console.info('[firebaseAdmin] using GOOGLE_APPLICATION_CREDENTIALS_JSON');
      return tryInitializeDefault({ credential: cert(key as Parameters<typeof cert>[0]) });
    } catch (err) {
      console.error('[firebaseAdmin] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON', err);
    }
  }

  console.info('[firebaseAdmin] using applicationDefault() credentials');
  return tryInitializeDefault({ credential: applicationDefault() });
}

export function getAdminAuth(): Auth {
  const app = ensureAdminApp();   // <- guaranteed in this process
  return getAuth(app);            // <- pass the app (no reliance on "default")
}

export function getAdminDb(): Firestore {
  const app = ensureAdminApp();   // <- guaranteed in this process
  return getFirestore(app);       // <- use Firestore with the named app
}
