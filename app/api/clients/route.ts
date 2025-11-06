// app/api/clients/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/clients';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type { Client, User } from '@/lib/models';

/** Create a new client with optional initial users. */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const client: Client = { name: data.name };
    const users: User[] = data.users ?? [];
    const id = await createClient(client, users);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** List all clients and their users. */
export async function GET() {
  try {
    const db = getAdminDb();
    const clientSnap = await db.collection('clients').get();
    const clients = await Promise.all(
      clientSnap.docs.map(async (doc) => {
        const usersSnap = await db.collection('users').where('clientId', '==', doc.id).get();
        const users = usersSnap.docs.map((u) => ({ id: u.id, ...u.data() }));
        return { id: doc.id, ...doc.data(), users };
      })
    );
    return NextResponse.json(clients);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

