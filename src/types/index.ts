/**
 * Shared type definitions for client and server components.
 * Keep this file free of server-only imports (db, crypto, etc.)
 */

export interface OAuth2Client {
  id: string;
  nanoId: string;
  secret: string;
  name: string;
  description?: string;
  icon?: string | null;
  appUrl?: string | null;
  redirectUris: string[];
  grants: string[];
  scopes: string[];
  status?: 'active' | 'disabled';
  userId?: string;
  createdAt?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}
