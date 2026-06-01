import { generateKeyPair, exportJWK, exportPKCS8, SignJWT } from 'jose';
import { getUserById } from './auth';
import { ISSUER } from './oauth2';
import { db } from './db';
const ID_TOKEN_EXPIRY = parseInt(process.env.OIDC_ID_TOKEN_EXPIRY || '3600');

let cachedKeyPair: { privateKey: CryptoKey; publicKey: CryptoKey; kid: string } | null = null;

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemBody = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    true,
    ['sign']
  );
}

async function extractPublicKey(privateKey: CryptoKey): Promise<CryptoKey> {
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  const publicJwk = { ...jwk };
  delete publicJwk.d;
  delete publicJwk.p;
  delete publicJwk.q;
  delete publicJwk.dp;
  delete publicJwk.dq;
  delete publicJwk.qi;
  return crypto.subtle.importKey(
    'jwk',
    publicJwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    true,
    ['verify']
  );
}

async function getKeyPair() {
  if (cachedKeyPair) return cachedKeyPair;

  // 1. Environment variable takes priority
  const privateKeyPem = process.env.OIDC_PRIVATE_KEY;
  if (privateKeyPem) {
    const privateKey = await importPrivateKey(privateKeyPem);
    const publicKey = await extractPublicKey(privateKey);
    const kid = process.env.OIDC_KEY_ID || 'default';
    cachedKeyPair = { privateKey, publicKey, kid };
    return cachedKeyPair;
  }

  // 2. Try loading from database
  try {
    const storedKey = await db.getGlobalConfigValue('oidc_private_key');
    if (storedKey) {
      const privateKey = await importPrivateKey(String(storedKey));
      const publicKey = await extractPublicKey(privateKey);
      const storedKid = await db.getGlobalConfigValue('oidc_key_id');
      const kid = storedKid ? String(storedKid) : 'default';
      cachedKeyPair = { privateKey, publicKey, kid };
      return cachedKeyPair;
    }
  } catch {
    // DB not ready yet (e.g. during initial setup), fall through to generate
  }

  // 3. Generate new key pair and persist to database
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const kid = `kid-${Date.now()}`;
  const pem = await exportPKCS8(privateKey);

  try {
    await db.setGlobalConfig('oidc_private_key', pem);
    await db.setGlobalConfig('oidc_key_id', kid);
  } catch (err) {
    console.error('Failed to persist OIDC key pair to database:', err);
  }

  cachedKeyPair = { privateKey, publicKey, kid };
  return cachedKeyPair;
}

export async function getSigningKey() {
  const { privateKey, kid } = await getKeyPair();
  return { privateKey, kid };
}

export async function getPublicJwks() {
  const { publicKey, kid } = await getKeyPair();
  const jwk = await exportJWK(publicKey);
  return {
    keys: [
      {
        ...jwk,
        kid,
        alg: 'RS256',
        use: 'sig',
      },
    ],
  };
}

export async function generateIdToken(
  userId: string,
  clientId: string,
  nonce?: string,
  scopes: string[] = []
): Promise<string> {
  const { privateKey, kid } = await getSigningKey();
  const user = await getUserById(userId);

  const now = Math.floor(Date.now() / 1000);

  const claims: Record<string, unknown> = {
    iss: ISSUER,
    sub: userId,
    aud: clientId,
    exp: now + ID_TOKEN_EXPIRY,
    iat: now,
    auth_time: now,
  };

  if (nonce) {
    claims.nonce = nonce;
  }

  if (scopes.includes('profile') && user) {
    claims.name = user.nickname || user.username;
    claims.preferred_username = user.username;
    claims.picture = user.avatar;
  }

  if (scopes.includes('email') && user) {
    claims.email = user.email;
    claims.email_verified = user.email_verified;
  }

  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid })
    .sign(privateKey);
}
