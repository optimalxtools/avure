// app/api/users/[userId]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { setUserModules } from '@/lib/clients';

interface Params {
  params: { userId: string };
}

/** Update a user's module permissions. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { modules } = await req.json();
    await setUserModules(params.userId, modules ?? []);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

