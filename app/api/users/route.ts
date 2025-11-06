// app/api/users/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { addUser } from '@/lib/clients';
import type { User } from '@/lib/models';

/** Add a user to an existing client. */
export async function POST(req: NextRequest) {
  try {
    const data: User = await req.json();
    const id = await addUser(data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

