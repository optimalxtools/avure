// lib/clients.ts

import { getAdminDb } from './firebaseAdmin';
import type { Client, User } from './models';

/**
 * Create a client and optional initial users.
 * Returns the new client's id.
 */
export async function createClient(client: Client, users: User[] = []): Promise<string> {
  const db = getAdminDb();
  const clientRef = await db.collection('clients').add({ name: client.name });
  const clientId = clientRef.id;
  if (users.length) {
    const batch = db.batch();
    users.forEach((u) => {
      const ref = db.collection('users').doc();
      batch.set(ref, {
        clientId,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        modules: u.modules ?? [],
      });
    });
    await batch.commit();
  }
  return clientId;
}

/** Add a user linked to a client. */
export async function addUser(user: User): Promise<string> {
  const db = getAdminDb();
  const ref = await db.collection('users').add(user);
  return ref.id;
}

/** Update the modules a user can access. */
export async function setUserModules(userId: string, modules: string[]): Promise<void> {
  const db = getAdminDb();
  await db.collection('users').doc(userId).update({ modules });
}

