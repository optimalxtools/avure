// app/api/health/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

const ADMIN_APP_NAME = 'vera-admin';

export async function GET() {
  const env = {
    K_SERVICE: !!process.env.K_SERVICE,
    FIREBASE_CONFIG: !!process.env.FIREBASE_CONFIG,
    PROJECT: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || null,
    node: process.version,
  };

  try {
    const apps = admin.apps as admin.app.App[];                      // <-- type it
    const before = apps.map(a => a.name);

    const existing = apps.find(a => a.name === ADMIN_APP_NAME);
    const app = existing ?? admin.initializeApp(undefined, ADMIN_APP_NAME); // pass undefined options, then name

    const after = (admin.apps as admin.app.App[]).map(a => a.name);

    // Always pass the *named* app
    await admin.auth(app).listUsers(1);

    return NextResponse.json({ ok: true, before, after, app: app.name, env });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: msg, apps: (admin.apps as admin.app.App[]).map(a => a.name), env },
      { status: 500 }
    );
  }
}
