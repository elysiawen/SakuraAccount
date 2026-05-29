import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { getUserById } from './auth';
import { ISSUER } from './oauth2';
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
  const { d, p, q, dp, dq, qi, ...publicJwk } = jwk;
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

  const privateKeyPem = process.env.OIDC_PRIVATE_KEY;

  if (privateKeyPem) {
    const privateKey = await importPrivateKey(privateKeyPem);
    const publicKey = await extractPublicKey(privateKey);
    const kid = process.env.OIDC_KEY_ID || 'default';
    cachedKeyPair = { privateKey, publicKey, kid };
    return cachedKeyPair;
  }

  // Auto-generate key pair
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const kid = process.env.OIDC_KEY_ID || `kid-${Date.now()}`;
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

  const claims: Record<string, any> = {
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
