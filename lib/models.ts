// lib/models.ts

export interface Client {
  id?: string;
  name: string;
}

export interface User {
  id?: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  modules: string[];
}

