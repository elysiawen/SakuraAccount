import { timingSafeEqual, createHash } from 'crypto';
import { nanoid } from 'nanoid';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { db, isExecuteWithAffectedRows, isExecuteWithRowCount } from './db';
import { DEFAULT_BASE_URL } from './utils';

const APP_SECRET = process.env.APP_SECRET;
if (!APP_SECRET) {
  throw new Error('FATAL: APP_SECRET environment variable is required.');
}
const SECRET = new TextEncoder().encode(APP_SECRET);
export const ACCESS_TOKEN_EXPIRY = parseInt(process.env.OAUTH2_ACCESS_TOKEN_EXPIRY || '3600');
const REFRESH_TOKEN_EXPIRY = parseInt(process.env.OAUTH2_REFRESH_TOKEN_EXPIRY || '2592000');
const AUTHORIZATION_CODE_EXPIRY = parseInt(process.env.OAUTH2_AUTHORIZATION_CODE_EXPIRY || '600');
export const ISSUER = process.env.OAUTH2_ISSUER || DEFAULT_BASE_URL;

import type { OAuth2Client } from '@/types';
export type { OAuth2Client };

export interface AuthorizationCode {
  id: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  nonce?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  expiresAt: Date;
}

export interface Token {
  id: string;
  clientId: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  scopes: string[];
  expiresAt: Date;
  refreshExpiresAt?: Date;
}

interface OAuth2ClientRow extends Record<string, unknown> {
  client_id: string;
  nano_id: string;
  secret: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  app_url?: string | null;
  redirect_uris: string | string[];
  grants: string | string[];
  scopes: string | string[];
  status?: 'active' | 'disabled' | null;
  user_id?: string | null;
  created_at?: string;
}

interface AuthorizationCodeRow extends Record<string, unknown> {
  id: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  scopes: string | string[];
  nonce?: string | null;
  code_challenge?: string | null;
  code_challenge_method?: string | null;
  expires_at: Date;
}

interface TokenRow extends Record<string, unknown> {
  id: string;
  client_id: string;
  user_id: string;
  access_token: string;
  refresh_token?: string | null;
  scopes: string | string[];
  expires_at: Date;
  refresh_expires_at?: Date | null;
  created_at?: string;
}

interface ClientSummaryRow extends Record<string, unknown> {
  nano_id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  status?: 'active' | 'disabled' | null;
  user_id?: string | null;
  username?: string | null;
  created_at?: string;
}

export async function createClient(data: Omit<OAuth2Client, 'clientId' | 'nanoId' | 'secret'>): Promise<OAuth2Client> {
  const clientId = nanoid(32);
  const nanoId = nanoid(32);
  const secret = nanoid(64);

  await db.execute(
    `INSERT INTO oauth2_clients (client_id, nano_id, secret, name, description, app_url, redirect_uris, grants, scopes, status, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [clientId, nanoId, secret, data.name, data.description ?? null, data.appUrl ?? null, JSON.stringify(data.redirectUris), JSON.stringify(data.grants), JSON.stringify(data.scopes), data.status ?? 'active', data.userId ?? null]
  );

  return {
    clientId,
    nanoId,
    secret,
    ...data,
  };
}

function mapClient(client: OAuth2ClientRow): OAuth2Client {
  return {
    clientId: client.client_id,
    nanoId: client.nano_id,
    secret: client.secret,
    name: client.name,
    description: client.description ?? undefined,
    icon: client.icon ?? undefined,
    appUrl: client.app_url ?? undefined,
    redirectUris: safeJsonParse(client.redirect_uris),
    grants: safeJsonParse(client.grants),
    scopes: safeJsonParse(client.scopes),
    status: client.status ?? 'active',
    userId: client.user_id ?? undefined,
    createdAt: client.created_at ?? undefined,
  };
}

async function ensureNanoId(client: OAuth2ClientRow): Promise<OAuth2ClientRow> {
  if (!client.nano_id) {
    const newNanoId = nanoid(32);
    await db.execute('UPDATE oauth2_clients SET nano_id = ? WHERE client_id = ?', [newNanoId, client.client_id]);
    client.nano_id = newNanoId;
  }
  return client;
}

async function ensureNanoIds(clients: OAuth2ClientRow[]): Promise<OAuth2ClientRow[]> {
  const missing = clients.filter(c => !c.nano_id);
  if (missing.length === 0) return clients;
  // Batch generate nano_ids and update in a single query
  for (const client of missing) {
    const newNanoId = nanoid(32);
    await db.execute('UPDATE oauth2_clients SET nano_id = ? WHERE client_id = ?', [newNanoId, client.client_id]);
    client.nano_id = newNanoId;
  }
  // TODO: replace with true batch UPDATE when DB supports it (e.g. CASE WHEN)
  return clients;
}

export async function getClient(clientId: string): Promise<OAuth2Client | null> {
  const client = await db.getOne<OAuth2ClientRow>('SELECT * FROM oauth2_clients WHERE client_id = ?', [clientId]);
  if (!client) return null;
  const ensured = await ensureNanoId(client);
  return mapClient(ensured);
}

export async function getClientByNanoId(nanoId: string): Promise<OAuth2Client | null> {
  const client = await db.getOne<OAuth2ClientRow>('SELECT * FROM oauth2_clients WHERE nano_id = ?', [nanoId]);
  if (!client) return null;
  return mapClient(client);
}

export async function validateClient(clientId: string, clientSecret?: string): Promise<OAuth2Client | null> {
  const client = await getClient(clientId);

  if (!client) return null;
  if (client.status === 'disabled') return null;
  if (clientSecret) {
    const secretBytes = new TextEncoder().encode(client.secret);
    const providedBytes = new TextEncoder().encode(clientSecret);
    if (
      secretBytes.length !== providedBytes.length ||
      !timingSafeEqual(secretBytes, providedBytes)
    ) {
      return null;
    }
  }

  return client;
}

export async function generateAuthorizationCode(
  nanoId: string,
  userId: string,
  redirectUri: string,
  scopes: string[],
  nonce?: string,
  codeChallenge?: string,
  codeChallengeMethod?: 'S256' | 'plain'
): Promise<string> {
  const code = nanoid(32);
  const expiresAt = new Date(Date.now() + AUTHORIZATION_CODE_EXPIRY * 1000);

  await db.execute(
    'INSERT INTO oauth2_authorization_codes (id, client_id, user_id, redirect_uri, scopes, nonce, code_challenge, code_challenge_method, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [code, nanoId, userId, redirectUri, JSON.stringify(scopes), nonce || null, codeChallenge || null, codeChallengeMethod || null, expiresAt]
  );

  return code;
}

export async function getAuthorizationCode(code: string): Promise<AuthorizationCode | null> {
  const authCode = await db.getOne<AuthorizationCodeRow>(
    'SELECT * FROM oauth2_authorization_codes WHERE id = ? AND expires_at > NOW()',
    [code]
  );

  if (!authCode) return null;

  return {
    id: authCode.id,
    clientId: authCode.client_id,
    userId: authCode.user_id,
    redirectUri: authCode.redirect_uri,
    scopes: safeJsonParse(authCode.scopes),
    nonce: authCode.nonce || undefined,
    codeChallenge: authCode.code_challenge || undefined,
    codeChallengeMethod: (authCode.code_challenge_method === 'S256' || authCode.code_challenge_method === 'plain')
      ? authCode.code_challenge_method
      : undefined,
    expiresAt: authCode.expires_at,
  };
}

export async function deleteAuthorizationCode(code: string): Promise<void> {
  await db.execute('DELETE FROM oauth2_authorization_codes WHERE id = ?', [code]);
}

export async function generateAccessToken(
  nanoId: string,
  userId: string | null,
  scopes: string[],
  clientId?: string
): Promise<Token> {
  const tokenId = nanoid(32);

  const accessToken = await new SignJWT({
    sub: userId || nanoId,
    client_id: clientId || nanoId,
    scope: scopes.join(' '),
    iss: ISSUER,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRY}s`)
    .setJti(tokenId)
    .sign(SECRET);

  const refreshToken = nanoid(64);
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY * 1000);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000);

  await db.execute(
    `INSERT INTO oauth2_tokens (id, client_id, user_id, access_token, refresh_token, scopes, expires_at, refresh_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tokenId, nanoId, userId, accessToken, refreshToken, JSON.stringify(scopes), expiresAt, refreshExpiresAt]
  );

  return {
    id: tokenId,
    clientId: nanoId,
    userId: userId || nanoId,
    accessToken,
    refreshToken,
    scopes,
    expiresAt,
    refreshExpiresAt,
  };
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function getTokenByAccessToken(accessToken: string): Promise<Token | null> {
  const token = await db.getOne<TokenRow>(
    'SELECT * FROM oauth2_tokens WHERE access_token = ? AND expires_at > NOW()',
    [accessToken]
  );

  if (!token) return null;

  return {
    id: token.id,
    clientId: token.client_id,
    userId: token.user_id,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? undefined,
    scopes: safeJsonParse(token.scopes),
    expiresAt: token.expires_at,
  };
}

export async function getTokenByRefreshToken(refreshToken: string): Promise<Token | null> {
  const token = await db.getOne<TokenRow>(
    'SELECT * FROM oauth2_tokens WHERE refresh_token = ? AND (refresh_expires_at IS NULL OR refresh_expires_at > NOW())',
    [refreshToken]
  );

  if (!token) return null;

  return {
    id: token.id,
    clientId: token.client_id,
    userId: token.user_id,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? undefined,
    scopes: safeJsonParse(token.scopes),
    expiresAt: token.expires_at,
    refreshExpiresAt: token.refresh_expires_at ?? undefined,
  };
}

export async function revokeToken(tokenId: string): Promise<void> {
  await db.execute('DELETE FROM oauth2_tokens WHERE id = ?', [tokenId]);
}

export async function revokeUserTokens(userId: string): Promise<void> {
  await db.execute('DELETE FROM oauth2_tokens WHERE user_id = ?', [userId]);
}

export async function getUserTokens(userId: string): Promise<Token[]> {
  const tokens = await db.query<TokenRow>(
    'SELECT * FROM oauth2_tokens WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  return tokens.map(token => ({
    id: token.id,
    clientId: token.client_id,
    userId: token.user_id,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? undefined,
    scopes: safeJsonParse(token.scopes),
    expiresAt: token.expires_at,
  }));
}

function safeJsonParse(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return JSON.parse(val);
  return [];
}

export async function getAllClients(): Promise<OAuth2Client[]> {
  const clients = await db.query<OAuth2ClientRow>('SELECT * FROM oauth2_clients ORDER BY created_at DESC');
  const ensured = await ensureNanoIds(clients);
  return ensured.map(mapClient);
}

export async function getAllClientsSummary(): Promise<(Pick<OAuth2Client, 'nanoId' | 'name' | 'description' | 'icon' | 'status' | 'userId' | 'createdAt'> & { username?: string })[]> {
  let clients: ClientSummaryRow[];
  try {
    clients = await db.query<ClientSummaryRow>('SELECT c.nano_id, c.name, c.description, c.icon, c.status, c.user_id, c.created_at, u.username FROM oauth2_clients c LEFT JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC');
  } catch (err) {
    // Fallback if status/icon columns don't exist yet
    console.warn('getAllClientsSummary full query failed, trying fallback:', err);
    clients = await db.query<ClientSummaryRow>('SELECT nano_id, name, description, user_id, created_at FROM oauth2_clients ORDER BY created_at DESC');
  }

  return clients.map(c => ({
    nanoId: c.nano_id,
    name: c.name,
    description: c.description ?? undefined,
    icon: c.icon ?? undefined,
    status: c.status ?? 'active',
    userId: c.user_id ?? undefined,
    username: c.username ?? undefined,
    createdAt: c.created_at ?? undefined,
  }));
}

export async function getUserClientsSummary(userId: string): Promise<Pick<OAuth2Client, 'nanoId' | 'name' | 'description' | 'icon' | 'status' | 'userId' | 'createdAt'>[]> {
  let clients: ClientSummaryRow[];
  try {
    clients = await db.query<ClientSummaryRow>('SELECT nano_id, name, description, icon, status, user_id, created_at FROM oauth2_clients WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  } catch (err) {
    console.warn('getUserClientsSummary full query failed, trying fallback:', err);
    clients = await db.query<ClientSummaryRow>('SELECT nano_id, name, description, user_id, created_at FROM oauth2_clients WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  }

  return clients.map(c => ({
    nanoId: c.nano_id,
    name: c.name,
    description: c.description ?? undefined,
    icon: c.icon ?? undefined,
    status: c.status ?? 'active',
    userId: c.user_id ?? undefined,
    createdAt: c.created_at ?? undefined,
  }));
}

export async function deleteClient(nanoId: string): Promise<boolean> {
  // Delete tokens first (cascade may not work if table was created before FK)
  try {
    await db.execute('DELETE FROM oauth2_tokens WHERE client_id = ?', [nanoId]);
    await db.execute('DELETE FROM oauth2_authorization_codes WHERE client_id = ?', [nanoId]);
  } catch (err) {
    console.warn('Manual cleanup before client delete failed:', err);
  }
  const result = await db.execute('DELETE FROM oauth2_clients WHERE nano_id = ?', [nanoId]);
  return (isExecuteWithAffectedRows(result) && result.affectedRows > 0)
    || (isExecuteWithRowCount(result) && (result.rowCount ?? 0) > 0);
}

export async function updateClient(nanoId: string, data: Partial<OAuth2Client>): Promise<void> {
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.redirectUris !== undefined) {
    fields.push('redirect_uris = ?');
    values.push(JSON.stringify(data.redirectUris));
  }
  if (data.grants !== undefined) {
    fields.push('grants = ?');
    values.push(JSON.stringify(data.grants));
  }
  if (data.scopes !== undefined) {
    fields.push('scopes = ?');
    values.push(JSON.stringify(data.scopes));
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }
  if (data.icon !== undefined) {
    fields.push('icon = ?');
    values.push(data.icon);
  }
  if (data.appUrl !== undefined) {
    fields.push('app_url = ?');
    values.push(data.appUrl);
  }

  if (fields.length === 0) return;

  values.push(nanoId);
  await db.execute(`UPDATE oauth2_clients SET ${fields.join(', ')} WHERE nano_id = ?`, values);
}

export async function getConsentedScopes(userId: string, nanoId: string): Promise<string[] | null> {
  const row = await db.getOne(
    'SELECT scopes FROM oauth2_consents WHERE user_id = ? AND client_id = ?',
    [userId, nanoId]
  );
  if (!row) return null;
  return safeJsonParse(row.scopes);
}

export async function saveConsent(userId: string, nanoId: string, scopes: string[]): Promise<void> {
  const scopesJson = JSON.stringify(scopes);
  await db.execute(
    'DELETE FROM oauth2_consents WHERE user_id = ? AND client_id = ?',
    [userId, nanoId]
  );
  await db.execute(
    'INSERT INTO oauth2_consents (user_id, client_id, scopes) VALUES (?, ?, ?)',
    [userId, nanoId, scopesJson]
  );
}

export async function deleteConsent(userId: string, nanoId: string): Promise<void> {
  await db.execute(
    'DELETE FROM oauth2_consents WHERE user_id = ? AND client_id = ?',
    [userId, nanoId]
  );
}

const CLIENT_ID_REGEX = /^[a-zA-Z0-9._-]+$/;

export async function changeClientId(nanoId: string, newClientId: string): Promise<{ success: boolean; error?: string }> {
  if (!newClientId || newClientId.length < 3 || newClientId.length > 255) {
    return { success: false, error: 'invalid' };
  }
  if (!CLIENT_ID_REGEX.test(newClientId)) {
    return { success: false, error: 'invalid' };
  }

  const client = await getClientByNanoId(nanoId);
  if (!client) {
    return { success: false, error: 'not_found' };
  }

  if (newClientId === client.clientId) {
    return { success: true };
  }

  try {
    await db.execute('UPDATE oauth2_clients SET client_id = ?, updated_at = NOW() WHERE nano_id = ?', [newClientId, nanoId]);
    return { success: true };
  } catch (err: unknown) {
    // Duplicate key: PG 23505, MySQL 1062
    const code = (err as { code?: string | number }).code;
    if (code === '23505' || code === 1062 || code === 'ER_DUP_ENTRY') {
      return { success: false, error: 'duplicate' };
    }
    throw err;
  }
}

export async function changeSecret(nanoId: string, newSecret: string): Promise<{ success: boolean; error?: string }> {
  if (!newSecret || newSecret.length < 16 || newSecret.length > 128) {
    return { success: false, error: 'invalid' };
  }

  const client = await getClientByNanoId(nanoId);
  if (!client) {
    return { success: false, error: 'not_found' };
  }

  await db.execute('UPDATE oauth2_clients SET secret = ?, updated_at = NOW() WHERE nano_id = ?', [newSecret, nanoId]);
  return { success: true };
}

// ─── PKCE (RFC 7636) ────────────────────────────────────────────────────────

/**
 * Verify a PKCE code_verifier against the stored code_challenge.
 * Returns true if the verifier matches, false otherwise.
 */
export function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  codeChallengeMethod: 'S256' | 'plain'
): boolean {
  if (!codeVerifier || codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }

  // RFC 7636 Section 4.1: code_verifier = 43-128 unreserved chars
  if (!/^[A-Za-z0-9._~-]+$/.test(codeVerifier)) {
    return false;
  }

  if (codeChallengeMethod === 'plain') {
    return codeVerifier === codeChallenge;
  }

  if (codeChallengeMethod === 'S256') {
    const hash = createHash('sha256').update(codeVerifier).digest('base64url');
    return hash === codeChallenge;
  }

  return false;
}

// ─── Token Revocation (RFC 7009) ─────────────────────────────────────────────

/**
 * Revoke a token by its value (access_token or refresh_token).
 * Returns true if a token was found and revoked.
 */
export async function revokeTokenByValue(tokenValue: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<boolean> {
  // Try to find and delete by access_token
  const result = await db.execute(
    `DELETE FROM oauth2_tokens WHERE ${tokenTypeHint === 'refresh_token' ? 'refresh_token = ?' : 'access_token = ? OR refresh_token = ?'}`,
    tokenTypeHint === 'refresh_token'
      ? [tokenValue]
      : [tokenValue, tokenValue]
  );

  const affected = isExecuteWithAffectedRows(result)
    ? result.affectedRows > 0
    : (isExecuteWithRowCount(result) && (result.rowCount ?? 0) > 0);

  return affected;
}
