import { nanoid } from 'nanoid';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';

const SECRET = new TextEncoder().encode(process.env.APP_SECRET || 'default-secret');
const ACCESS_TOKEN_EXPIRY = parseInt(process.env.OAUTH2_ACCESS_TOKEN_EXPIRY || '3600');
const AUTHORIZATION_CODE_EXPIRY = parseInt(process.env.OAUTH2_AUTHORIZATION_CODE_EXPIRY || '600');
const ISSUER = process.env.OAUTH2_ISSUER || 'http://localhost:3000';

export interface OAuth2Client {
  id: string;
  nanoId: string;
  secret: string;
  name: string;
  description?: string;
  redirectUris: string[];
  grants: string[];
  scopes: string[];
  status: 'active' | 'disabled';
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
}

export async function createClient(data: Omit<OAuth2Client, 'id' | 'nanoId' | 'secret'>): Promise<OAuth2Client> {
  const id = nanoid(32);
  const nanoId = nanoid(32);
  const secret = nanoid(64);

  await db.execute(
    `INSERT INTO oauth2_clients (id, nano_id, secret, name, description, redirect_uris, grants, scopes, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, nanoId, secret, data.name, data.description, JSON.stringify(data.redirectUris), JSON.stringify(data.grants), JSON.stringify(data.scopes), data.userId]
  );

  return {
    id,
    nanoId,
    secret,
    ...data,
  };
}

function mapClient(client: any): OAuth2Client {
  return {
    id: client.id,
    nanoId: client.nano_id,
    secret: client.secret,
    name: client.name,
    description: client.description,
    redirectUris: safeJsonParse(client.redirect_uris),
    grants: safeJsonParse(client.grants),
    scopes: safeJsonParse(client.scopes),
    status: client.status || 'active',
    userId: client.user_id,
    createdAt: client.created_at,
  };
}

async function ensureNanoId(client: any): Promise<OAuth2Client> {
  if (!client.nano_id) {
    const newNanoId = nanoid(32);
    await db.execute('UPDATE oauth2_clients SET nano_id = ? WHERE id = ?', [newNanoId, client.id]);
    client.nano_id = newNanoId;
  }
  return mapClient(client);
}

export async function getClient(clientId: string): Promise<OAuth2Client | null> {
  const client = await db.getOne('SELECT * FROM oauth2_clients WHERE id = ?', [clientId]);
  if (!client) return null;
  return ensureNanoId(client);
}

export async function getClientByNanoId(nanoId: string): Promise<OAuth2Client | null> {
  const client = await db.getOne('SELECT * FROM oauth2_clients WHERE nano_id = ?', [nanoId]);
  if (!client) return null;
  return mapClient(client);
}

export async function validateClient(clientId: string, clientSecret?: string): Promise<OAuth2Client | null> {
  const client = await getClient(clientId);

  if (!client) return null;
  if (client.status === 'disabled') return null;
  if (clientSecret && client.secret !== clientSecret) return null;

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
  const authCode = await db.getOne(
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
  userId: string,
  scopes: string[]
): Promise<Token> {
  const tokenId = nanoid(32);

  const accessToken = await new SignJWT({
    sub: userId,
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

  await db.execute(
    `INSERT INTO oauth2_tokens (id, client_id, user_id, access_token, refresh_token, scopes, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tokenId, clientId, userId, accessToken, refreshToken, JSON.stringify(scopes), expiresAt]
  );

  return {
    id: tokenId,
    clientId,
    userId,
    accessToken,
    refreshToken,
    scopes,
    expiresAt,
  };
}

export async function verifyAccessToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function getTokenByAccessToken(accessToken: string): Promise<Token | null> {
  const token = await db.getOne(
    'SELECT * FROM oauth2_tokens WHERE access_token = ? AND expires_at > NOW()',
    [accessToken]
  );

  if (!token) return null;

  return {
    id: token.id,
    clientId: token.client_id,
    userId: token.user_id,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    scopes: safeJsonParse(token.scopes),
    expiresAt: token.expires_at,
  };
}

export async function getTokenByRefreshToken(refreshToken: string): Promise<Token | null> {
  const token = await db.getOne(
    'SELECT * FROM oauth2_tokens WHERE refresh_token = ?',
    [refreshToken]
  );

  if (!token) return null;

  return {
    id: token.id,
    clientId: token.client_id,
    userId: token.user_id,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    scopes: safeJsonParse(token.scopes),
    expiresAt: token.expires_at,
  };
}

export async function revokeToken(tokenId: string): Promise<void> {
  await db.execute('DELETE FROM oauth2_tokens WHERE id = ?', [tokenId]);
}

export async function revokeUserTokens(userId: string): Promise<void> {
  await db.execute('DELETE FROM oauth2_tokens WHERE user_id = ?', [userId]);
}

export async function getUserTokens(userId: string): Promise<Token[]> {
  const tokens = await db.query(
    'SELECT * FROM oauth2_tokens WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  return tokens.map(token => ({
    id: token.id,
    clientId: token.client_id,
    userId: token.user_id,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    scopes: safeJsonParse(token.scopes),
    expiresAt: token.expires_at,
  }));
}

function safeJsonParse(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return JSON.parse(val);
  return [];
}

export async function getAllClients(): Promise<OAuth2Client[]> {
  const clients = await db.query('SELECT * FROM oauth2_clients ORDER BY created_at DESC');

  return Promise.all(clients.map(client => ensureNanoId(client)));
}

export async function getAllClientsSummary(): Promise<Pick<OAuth2Client, 'nanoId' | 'name' | 'description' | 'status' | 'userId' | 'createdAt'>[]> {
  let clients: any[];
  try {
    clients = await db.query('SELECT nano_id, name, description, status, user_id, created_at FROM oauth2_clients ORDER BY created_at DESC');
  } catch {
    // Fallback if status column doesn't exist yet
    clients = await db.query('SELECT nano_id, name, description, user_id, created_at FROM oauth2_clients ORDER BY created_at DESC');
  }

  return clients.map(c => ({
    nanoId: c.nano_id,
    name: c.name,
    description: c.description,
    status: c.status || 'active',
    userId: c.user_id,
    createdAt: c.created_at,
  }));
}

export async function deleteClient(nanoId: string): Promise<boolean> {
  const result = await db.execute('DELETE FROM oauth2_clients WHERE nano_id = ?', [nanoId]);
  return result.affectedRows > 0 || result.rowCount > 0;
}

export async function updateClient(nanoId: string, data: Partial<OAuth2Client>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

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

  if (fields.length === 0) return;

  values.push(nanoId);
  await db.execute(`UPDATE oauth2_clients SET ${fields.join(', ')} WHERE nano_id = ?`, values);
}
