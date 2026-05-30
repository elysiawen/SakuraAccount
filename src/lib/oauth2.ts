import { timingSafeEqual } from 'crypto';
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

export interface AuthorizationCode {
  id: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  nonce?: string;
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
  id: string;
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

export async function createClient(data: Omit<OAuth2Client, 'id' | 'nanoId' | 'secret'>): Promise<OAuth2Client> {
  const id = nanoid(32);
  const nanoId = nanoid(32);
  const secret = nanoid(64);

  await db.execute(
    `INSERT INTO oauth2_clients (id, nano_id, secret, name, description, app_url, redirect_uris, grants, scopes, status, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, nanoId, secret, data.name, data.description ?? null, data.appUrl ?? null, JSON.stringify(data.redirectUris), JSON.stringify(data.grants), JSON.stringify(data.scopes), data.status ?? 'active', data.userId ?? null]
  );

  return {
    id,
    nanoId,
    secret,
    ...data,
  };
}

function mapClient(client: OAuth2ClientRow): OAuth2Client {
  return {
    id: client.id,
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

async function ensureNanoId(client: OAuth2ClientRow): Promise<OAuth2Client> {
  if (!client.nano_id) {
    const newNanoId = nanoid(32);
    await db.execute('UPDATE oauth2_clients SET nano_id = ? WHERE id = ?', [newNanoId, client.id]);
    client.nano_id = newNanoId;
  }
  return mapClient(client);
}

export async function getClient(clientId: string): Promise<OAuth2Client | null> {
  const client = await db.getOne<OAuth2ClientRow>('SELECT * FROM oauth2_clients WHERE id = ?', [clientId]);
  if (!client) return null;
  return ensureNanoId(client);
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
  clientId: string,
  userId: string,
  redirectUri: string,
  scopes: string[],
  nonce?: string
): Promise<string> {
  const code = nanoid(32);
  const expiresAt = new Date(Date.now() + AUTHORIZATION_CODE_EXPIRY * 1000);

  await db.execute(
    'INSERT INTO oauth2_authorization_codes (id, client_id, user_id, redirect_uri, scopes, nonce, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [code, clientId, userId, redirectUri, JSON.stringify(scopes), nonce || null, expiresAt]
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
    expiresAt: authCode.expires_at,
  };
}

export async function deleteAuthorizationCode(code: string): Promise<void> {
  await db.execute('DELETE FROM oauth2_authorization_codes WHERE id = ?', [code]);
}

export async function generateAccessToken(
  clientId: string,
  userId: string | null,
  scopes: string[]
): Promise<Token> {
  const tokenId = nanoid(32);

  const accessToken = await new SignJWT({
    sub: userId || clientId,
    client_id: clientId,
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
    [tokenId, clientId, userId, accessToken, refreshToken, JSON.stringify(scopes), expiresAt, refreshExpiresAt]
  );

  return {
    id: tokenId,
    clientId,
    userId: userId || clientId,
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

  return Promise.all(clients.map(client => ensureNanoId(client)));
}

export async function getAllClientsSummary(): Promise<(Pick<OAuth2Client, 'nanoId' | 'name' | 'description' | 'icon' | 'status' | 'userId' | 'createdAt'> & { username?: string })[]> {
  let clients: ClientSummaryRow[];
  try {
    clients = await db.query<ClientSummaryRow>('SELECT c.nano_id, c.name, c.description, c.icon, c.status, c.user_id, c.created_at, u.username FROM oauth2_clients c LEFT JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC');
  } catch {
    // Fallback if status/icon columns don't exist yet
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
  } catch {
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
  const client = await db.getOne<{ id: string }>('SELECT id FROM oauth2_clients WHERE nano_id = ?', [nanoId]);
  if (client) {
    await db.execute('DELETE FROM oauth2_tokens WHERE client_id = ?', [client.id]);
    await db.execute('DELETE FROM oauth2_authorization_codes WHERE client_id = ?', [client.id]);
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

export async function getConsentedScopes(userId: string, clientId: string): Promise<string[] | null> {
  const row = await db.getOne(
    'SELECT scopes FROM oauth2_consents WHERE user_id = ? AND client_id = ?',
    [userId, clientId]
  );
  if (!row) return null;
  return safeJsonParse(row.scopes);
}

export async function saveConsent(userId: string, clientId: string, scopes: string[]): Promise<void> {
  const scopesJson = JSON.stringify(scopes);
  await db.execute(
    'DELETE FROM oauth2_consents WHERE user_id = ? AND client_id = ?',
    [userId, clientId]
  );
  await db.execute(
    'INSERT INTO oauth2_consents (user_id, client_id, scopes) VALUES (?, ?, ?)',
    [userId, clientId, scopesJson]
  );
}

export async function deleteConsent(userId: string, clientId: string): Promise<void> {
  await db.execute(
    'DELETE FROM oauth2_consents WHERE user_id = ? AND client_id = ?',
    [userId, clientId]
  );
}
