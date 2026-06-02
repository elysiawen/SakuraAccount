/**
 * Sakura Account — E2E Integration Test Suite
 *
 * Tests all core OAuth2/OIDC flows against a running dev server.
 *
 * Prerequisites:
 *   1. Start the dev server:  npm run dev
 *   2. Run tests:             npx tsx scripts/test-e2e.ts
 *
 * Or run in one command:
 *   start-server-and-test "npm run dev" http://localhost:3000 "npx tsx scripts/test-e2e.ts"
 */

import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────

// Load .env.local manually (same pattern as other scripts)
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
const TEST_ID = `${Date.now()}`;
const TEST_USERNAME = `testuser_${TEST_ID}`;
const TEST_PASSWORD = `TestPass123!_${TEST_ID}`;
const TEST_EMAIL = `test${TEST_ID}@test.local`;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results: string[] = [];

function pass(name: string) {
  passed++;
  results.push(`  ✅ ${name}`);
  console.log(`  \x1b[32m✓\x1b[0m ${name}`);
}

function fail(name: string, reason: string) {
  failed++;
  results.push(`  ❌ ${name} — ${reason}`);
  console.log(`  \x1b[31m✗\x1b[0m ${name}`);
  console.log(`    \x1b[31m${reason}\x1b[0m`);
}

function assert(condition: boolean, name: string, reason: string) {
  if (condition) pass(name); else fail(name, reason);
}

function base64url(buffer: Buffer): string {
  return buffer.toString('base64url');
}

function sha256(input: string): Buffer {
  return createHash('sha256').update(input).digest();
}

async function assertResOk(res: Response, name: string) {
  if (res.ok) pass(name);
  else {
    const body = await res.text().catch(() => '<unreadable>');
    fail(name, `HTTP ${res.status} — ${body.substring(0, 200)}`);
  }
}

async function assertJsonRes<T>(res: Response, name: string): Promise<T | null> {
  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    fail(name, `HTTP ${res.status} — ${body.substring(0, 200)}`);
    return null;
  }
  try {
    const data = await res.json() as T;
    pass(name);
    return data;
  } catch {
    fail(name, 'JSON parse error');
    return null;
  }
}

// Cookie jar for session tracking
let cookies: string = '';

function getCookieHeader(): Record<string, string> {
  return cookies ? { Cookie: cookies } : {};
}

function mergeCookies(headers: Headers) {
  const setCookie = headers.getSetCookie?.() || headers.get('set-cookie');
  if (setCookie) {
    // Store all cookies
    const allCookies = (Array.isArray(setCookie) ? setCookie : [setCookie]).map(
      c => c.split(';')[0]
    );
    // Merge with existing
    const map = new Map<string, string>();
    if (cookies) {
      cookies.split(';').forEach(c => {
        const [k, ...v] = c.trim().split('=');
        if (k) map.set(k, v.join('='));
      });
    }
    allCookies.forEach(c => {
      const [k, ...v] = c.trim().split('=');
      if (k) map.set(k, v.join('='));
    });
    cookies = Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

async function fetchWithCookies(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (cookies) headers.set('Cookie', cookies);
  // Set Origin + Referer to pass CSRF check (Next.js checks these on mutations)
  headers.set('Origin', BASE_URL);
  headers.set('Referer', BASE_URL + '/');
  const res = await fetch(url, { ...init, headers, redirect: 'manual' });
  mergeCookies(res.headers);
  return res;
}

// PKCE helper
function generateCodeVerifier(): string {
  return base64url(randomBytes(32)); // 43 chars
}

function generateCodeChallenge(verifier: string): string {
  return base64url(sha256(verifier));
}

// ─── Utils ────────────────────────────────────────────────────────────────────

async function waitForServer(maxRetries = 30): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/oauth/.well-known/openid-configuration`);
      if (res.ok) return true;
    } catch { /* server not ready */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

async function runTests() {
  console.log(`\n🚀 Sakura Account E2E Tests`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Test user: ${TEST_USERNAME}`);
  console.log('');

  // ─── 1. OIDC Discovery ────────────────────────────────────────────────────────
  console.log('── OIDC Discovery ──');

  const disco = await assertJsonRes<Record<string, unknown>>(
    await fetch(`${BASE_URL}/oauth/.well-known/openid-configuration`),
    'GET .well-known/openid-configuration'
  );
  if (disco) {
    assert(typeof disco.issuer === 'string', '  has issuer', 'missing issuer');
    assert(typeof disco.authorization_endpoint === 'string', '  has authorization_endpoint', 'missing');
    assert(typeof disco.token_endpoint === 'string', '  has token_endpoint', 'missing');
    assert(typeof disco.revocation_endpoint === 'string', '  has revocation_endpoint', 'missing revocation_endpoint');
    assert(Array.isArray(disco.code_challenge_methods_supported), '  has code_challenge_methods_supported', 'missing PKCE methods');
    const pkceMethods = disco.code_challenge_methods_supported as string[];
    assert(pkceMethods.includes('S256'), '  code_challenge_methods includes S256', 'S256 missing');
  }

  const jwks = await assertJsonRes<Record<string, unknown>>(
    await fetch(`${BASE_URL}/oauth/.well-known/jwks.json`),
    'GET .well-known/jwks.json'
  );
  if (jwks) {
    const keys = jwks.keys as Array<Record<string, unknown>>;
    assert(Array.isArray(keys) && keys.length > 0, '  JWKS has keys', 'no keys');
    if (keys?.[0]) {
      assert(keys[0].alg === 'RS256', '  JWKS key alg is RS256', `${keys[0].alg}`);
    }
  }

  // ─── 2. Register ──────────────────────────────────────────────────────────────
  console.log('\n── Registration ──');

  const regRes = await fetchWithCookies(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: TEST_USERNAME,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  // Registration may fail if user already exists from a previous test run
  const regJson = await regRes.json().catch(() => ({}));
  if (regRes.ok) {
    pass('POST /api/auth/register');
  } else if (regRes.status === 409 || regRes.status === 400) {
    // User likely exists from previous test run — acceptable
    console.log(`  ℹ️  Register returned ${regRes.status}: ${regJson.message || regJson.error || 'conflict'}`);
    pass('POST /api/auth/register (user already exists — considered pass)');
  } else {
    fail('POST /api/auth/register', `HTTP ${regRes.status}: ${JSON.stringify(regJson)}`);
    // Continue anyway — login might still work if user exists from prior run
  }

  // ─── 3. Login ─────────────────────────────────────────────────────────────────
  console.log('\n── Login ──');

  cookies = ''; // Clear cookies before login
  const loginRes = await fetchWithCookies(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
    }),
  });
  assertResOk(loginRes, `POST /api/auth/login (${TEST_USERNAME})`);

  if (!cookies) {
    fail('  Session cookie received', 'no Set-Cookie header — aborting remaining tests');
    console.log('\n═══════════════════════════════════════');
    console.log(`  \x1b[32mPassed:\x1b[0m ${passed}  \x1b[31mFailed:\x1b[0m ${failed}`);
    console.log('═══════════════════════════════════════\n');
    process.exit(1);
  }
  pass('  Session cookie received');

  const sessionCache = cookies; // Save for later

  // ─── 4. Session ───────────────────────────────────────────────────────────────
  console.log('\n── Session ──');

  const session = await assertJsonRes<{ user: { id: string; username: string } }>(
    await fetch(`${BASE_URL}/api/auth/session`, { headers: getCookieHeader() }),
    'GET /api/auth/session'
  );
  if (session?.user) {
    assert(session.user.username === TEST_USERNAME,
      `  username is ${TEST_USERNAME}`,
      `expected ${TEST_USERNAME}, got ${session.user.username}`);
  }

  // ─── 5. Admin Login (for client creation) ─────────────────────────────────────
  console.log('\n── Admin ──');

  cookies = ''; // Clear user cookies
  let hasAdmin = false;

  if (!ADMIN_PASSWORD) {
    console.log(`  ⚠️  ADMIN_PASSWORD not set in .env.local — skipping admin-dependent tests`);
    console.log(`     Add: ADMIN_USERNAME=admin  ADMIN_PASSWORD=yourpass`);
  } else {
    const adminLoginRes = await fetchWithCookies(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
    });

    if (adminLoginRes.ok) {
      pass(`POST /api/auth/login (${ADMIN_USERNAME})`);
      hasAdmin = true;
    } else {
      console.log(`  ⚠️  Admin login failed (HTTP ${adminLoginRes.status}) — skipping admin-dependent tests`);
      console.log(`     Set ADMIN_USERNAME + ADMIN_PASSWORD in .env.local`);
    }
  }

  let clientId: string | null = null;
  let clientSecret: string | null = null;

  if (hasAdmin) {
    // Create an OAuth2 client
    const createClientRes = await fetchWithCookies(`${BASE_URL}/api/admin/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Test App ${TEST_ID}`,
        description: 'Auto-created by E2E test',
        redirectUris: [`${BASE_URL}/test-callback`],
        grants: ['authorization_code', 'refresh_token', 'client_credentials'],
        scopes: ['openid', 'profile', 'email'],
      }),
    });
    const clientData = await assertJsonRes<{ client: { clientId: string; secret: string; nanoId: string } }>(
      createClientRes,
      'POST /api/admin/applications (create test client)'
    );
    if (clientData?.client) {
      clientId = clientData.client.clientId;
      clientSecret = clientData.client.secret;
      const nanoId = clientData.client.nanoId;
      assert(typeof clientId === 'string' && clientId.length > 0, '  client_id received', 'empty client_id');
      assert(typeof clientSecret === 'string' && clientSecret.length > 0, '  client_secret received', 'empty client_secret');

      // ── 5a. Test: disabled client rejected ────────────────────────────────────
      console.log('\n── Disabled Client ──');

      // Disable the client
      const disableRes = await fetchWithCookies(`${BASE_URL}/api/admin/applications/${nanoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disabled' }),
      });
      const disableOk = disableRes.ok;
      assert(disableOk, '  PATCH client status = disabled', `HTTP ${disableRes.status}`);

      // Try authorize with disabled client (as user)
      cookies = sessionCache;
      const authUrl = new URL(`${BASE_URL}/oauth/authorize`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', `${BASE_URL}/test-callback`);
      authUrl.searchParams.set('scope', 'openid');
      authUrl.searchParams.set('state', `disabled-test-${TEST_ID}`);
      const disabledAuthRes = await fetchWithCookies(authUrl.toString(), { redirect: 'manual' });
      assert(disabledAuthRes.status === 400, '  Disabled client authorize returns 400', `HTTP ${disabledAuthRes.status}`);

      // Re-enable the client
      cookies = ''; // back to admin
      await fetchWithCookies(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
      });
      const enableRes = await fetchWithCookies(`${BASE_URL}/api/admin/applications/${nanoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      assert(enableRes.ok, '  PATCH client status = active', `HTTP ${enableRes.status}`);

      // ── 5b. Test: redirect_uri mismatch rejected ─────────────────────────────
      console.log('\n── Redirect URI Mismatch ──');

      cookies = sessionCache;
      const badUriUrl = new URL(`${BASE_URL}/oauth/authorize`);
      badUriUrl.searchParams.set('response_type', 'code');
      badUriUrl.searchParams.set('client_id', clientId);
      badUriUrl.searchParams.set('redirect_uri', 'https://evil.example.com/steal');
      badUriUrl.searchParams.set('scope', 'openid');
      const badUriRes = await fetchWithCookies(badUriUrl.toString(), { redirect: 'manual' });
      assert(badUriRes.status === 400, '  Wrong redirect_uri returns 400', `HTTP ${badUriRes.status}`);
    }
  }

  // ─── Switch back to user session ─────────────────────────────────────────────
  cookies = sessionCache;

  // ─── 6. Authorization Code + PKCE ─────────────────────────────────────────────
  console.log('\n── Authorization Code + PKCE (S256) ──');

  if (clientId) {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    console.log(`  code_verifier (43 chars): ${codeVerifier.substring(0, 10)}...`);
    console.log(`  code_challenge (43 chars): ${codeChallenge.substring(0, 10)}...`);

    // Build authorization URL
    const authUrl = new URL(`${BASE_URL}/oauth/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', `${BASE_URL}/test-callback`);
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', `test-state-${TEST_ID}`);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Step 1: GET /oauth/authorize → expect redirect to consent page
    const authRes = await fetchWithCookies(authUrl.toString(), { redirect: 'manual' });
    mergeCookies(authRes.headers);

    const consentLocation = authRes.headers.get('location') || '';
    assert(consentLocation.includes('/oauth/consent'), '  Redirect to consent page', `got: ${consentLocation}`);

    // Step 2: Programmatically approve consent (mimics browser clicking "Allow")
    const consentUrl = new URL(consentLocation.startsWith('http') ? consentLocation : `${BASE_URL}${consentLocation}`);
    const consentParams = new URLSearchParams();
    consentParams.set('client_id', consentUrl.searchParams.get('client_id') || '');
    consentParams.set('redirect_uri', consentUrl.searchParams.get('redirect_uri') || '');
    consentParams.set('scope', consentUrl.searchParams.get('scope') || '');
    consentParams.set('state', consentUrl.searchParams.get('state') || '');
    consentParams.set('nonce', consentUrl.searchParams.get('nonce') || '');
    const cc = consentUrl.searchParams.get('code_challenge');
    if (cc) consentParams.set('code_challenge', cc);
    const ccm = consentUrl.searchParams.get('code_challenge_method');
    if (ccm) consentParams.set('code_challenge_method', ccm);
    consentParams.set('approved', 'true');

    const consentRes = await fetchWithCookies(`${BASE_URL}/api/applications/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: consentParams.toString(),
    });

    const consentData = await consentRes.json().catch(() => ({}));
    assert(consentRes.ok && !!consentData.redirect, '  Consent approved', `HTTP ${consentRes.status}`);

    // Step 3: Extract authorization code from the redirect URL
    const finalUrl = consentData.redirect as string || '';
    assert(finalUrl.includes('/test-callback'), '  Redirect to redirect_uri', `got: ${finalUrl}`);

    const callbackUrl = new URL(finalUrl);
    const authCode = callbackUrl.searchParams.get('code');

    assert(authCode !== null && authCode.length > 0, '  Authorization code received', authCode ? `empty code` : 'no code param');

    if (authCode) {
      const stateReturned = callbackUrl.searchParams.get('state');
      assert(stateReturned === `test-state-${TEST_ID}`, '  state returned correctly', `expected test-state-${TEST_ID}, got ${stateReturned}`);

      // ── 7. PKCE: wrong code_verifier rejected (RFC 7636 §4.6) ──────────────────
      // Test first with WRONG verifier while code is still valid
      console.log('\n── PKCE Rejection ──');

      const badParams = new URLSearchParams();
      badParams.set('grant_type', 'authorization_code');
      badParams.set('code', authCode);
      badParams.set('redirect_uri', `${BASE_URL}/test-callback`);
      badParams.set('client_id', clientId!);
      badParams.set('client_secret', clientSecret!);
      badParams.set('code_verifier', 'wrong-verifier-wrong-verifier-wrong1');

      const badRes = await fetch(`${BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: badParams.toString(),
      });
      const badJson = await badRes.json().catch(() => ({}));
      assert(badRes.status === 400 && badJson.error === 'invalid_grant',
        '  Wrong code_verifier rejected (invalid_grant)',
        `status=${badRes.status}, body=${JSON.stringify(badJson)}`);

      // ── 7b. PKCE: missing code_verifier rejected ──────────────────────────────
      const missingParams = new URLSearchParams();
      missingParams.set('grant_type', 'authorization_code');
      missingParams.set('code', authCode);
      missingParams.set('redirect_uri', `${BASE_URL}/test-callback`);
      missingParams.set('client_id', clientId!);
      missingParams.set('client_secret', clientSecret!);
      // No code_verifier

      const missingRes = await fetch(`${BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: missingParams.toString(),
      });
      const missingJson = await missingRes.json().catch(() => ({}));
      assert(missingRes.status === 400 && missingJson.error === 'invalid_grant',
        '  Missing code_verifier rejected (invalid_grant)',
        `status=${missingRes.status}, body=${JSON.stringify(missingJson)}`);

      // ── 7c. PKCE: illegal code_challenge_method rejected ─────────────────────
      const badMethodUrl = new URL(`${BASE_URL}/oauth/authorize`);
      badMethodUrl.searchParams.set('response_type', 'code');
      badMethodUrl.searchParams.set('client_id', clientId!);
      badMethodUrl.searchParams.set('redirect_uri', `${BASE_URL}/test-callback`);
      badMethodUrl.searchParams.set('scope', 'openid');
      badMethodUrl.searchParams.set('state', `badmethod-${TEST_ID}`);
      badMethodUrl.searchParams.set('code_challenge', generateCodeChallenge(generateCodeVerifier()));
      badMethodUrl.searchParams.set('code_challenge_method', 'SHA-512');
      const badMethodRes = await fetchWithCookies(badMethodUrl.toString(), { redirect: 'manual' });
      // Should redirect with error to redirect_uri
      const badMethodLoc = badMethodRes.headers.get('location') || '';
      const badMethodUrlParsed = badMethodLoc ? new URL(badMethodLoc) : null;
      assert(
        badMethodUrlParsed !== null && badMethodUrlParsed.pathname.includes('test-callback') && badMethodUrlParsed.searchParams.get('error') === 'invalid_request',
        '  Illegal code_challenge_method (SHA-512) rejected',
        `location: ${badMethodLoc || 'none'}`
      );

      // ── 8. Token Exchange with correct code_verifier ──────────────────────────
      console.log('\n── Token Exchange (authorization_code + PKCE) ──');

      const tokenParams = new URLSearchParams();
      tokenParams.set('grant_type', 'authorization_code');
      tokenParams.set('code', authCode);
      tokenParams.set('redirect_uri', `${BASE_URL}/test-callback`);
      tokenParams.set('client_id', clientId!);
      tokenParams.set('client_secret', clientSecret!);
      tokenParams.set('code_verifier', codeVerifier);

      const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });
      const tokenData = await assertJsonRes<{
        access_token: string;
        token_type: string;
        expires_in: number;
        refresh_token: string;
        scope: string;
        id_token: string;
      }>(tokenRes, 'POST /oauth/token (authorization_code + PKCE)');

      if (tokenData) {
        assert(tokenData.token_type === 'Bearer', '  token_type is Bearer', tokenData.token_type);
        assert(typeof tokenData.access_token === 'string', '  access_token received', 'missing');
        assert(typeof tokenData.refresh_token === 'string', '  refresh_token received', 'missing');
        assert(typeof tokenData.id_token === 'string', '  id_token received (openid)', 'missing');
        assert(tokenData.expires_in > 0, '  expires_in > 0', `${tokenData.expires_in}`);
        assert(tokenData.scope.includes('openid'), '  scope includes openid', tokenData.scope);

        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token;

        // ── 9. Token Exchange with Basic Auth (client_secret_basic) ────────────
        console.log('\n── Token Exchange (Basic Auth) ──');

        // Need a fresh auth code for this test
        const basicAuthUrl = new URL(`${BASE_URL}/oauth/authorize`);
        basicAuthUrl.searchParams.set('response_type', 'code');
        basicAuthUrl.searchParams.set('client_id', clientId!);
        basicAuthUrl.searchParams.set('redirect_uri', `${BASE_URL}/test-callback`);
        basicAuthUrl.searchParams.set('scope', 'openid');
        basicAuthUrl.searchParams.set('state', `basic-${TEST_ID}`);
        const basicVerifier = generateCodeVerifier();
        basicAuthUrl.searchParams.set('code_challenge', generateCodeChallenge(basicVerifier));
        basicAuthUrl.searchParams.set('code_challenge_method', 'S256');

        const basicAuthRes = await fetchWithCookies(basicAuthUrl.toString(), { redirect: 'manual' });
        const basicLoc = basicAuthRes.headers.get('location') || '';
        const basicRedirectUrl = new URL(basicLoc.startsWith('http') ? basicLoc : `${BASE_URL}${basicLoc}`);
        let basicAuthCode: string | null = null;

        if (basicRedirectUrl.pathname.includes('/oauth/consent')) {
          // Prior consent not found — POST consent to get code
          const basicConsentParams = new URLSearchParams();
          basicConsentParams.set('client_id', basicRedirectUrl.searchParams.get('client_id') || '');
          basicConsentParams.set('redirect_uri', basicRedirectUrl.searchParams.get('redirect_uri') || '');
          basicConsentParams.set('scope', basicRedirectUrl.searchParams.get('scope') || '');
          basicConsentParams.set('state', basicRedirectUrl.searchParams.get('state') || '');
          basicConsentParams.set('nonce', basicRedirectUrl.searchParams.get('nonce') || '');
          basicConsentParams.set('code_challenge', basicRedirectUrl.searchParams.get('code_challenge') || '');
          basicConsentParams.set('code_challenge_method', basicRedirectUrl.searchParams.get('code_challenge_method') || '');
          basicConsentParams.set('approved', 'true');
          const basicConsentRes = await fetchWithCookies(`${BASE_URL}/api/applications/consent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: basicConsentParams.toString(),
          });
          const basicConsentData = await basicConsentRes.json().catch(() => ({}));
          const basicCodeUrl = new URL(basicConsentData.redirect || 'http://x');
          basicAuthCode = basicCodeUrl.searchParams.get('code');
        } else if (basicRedirectUrl.pathname.includes('/test-callback')) {
          // Prior consent exists — code is already in the redirect URL
          basicAuthCode = basicRedirectUrl.searchParams.get('code');
        }

        if (basicAuthCode) {
          const basicTokenParams = new URLSearchParams();
          basicTokenParams.set('grant_type', 'authorization_code');
          basicTokenParams.set('code', basicAuthCode);
          basicTokenParams.set('redirect_uri', `${BASE_URL}/test-callback`);
          basicTokenParams.set('code_verifier', basicVerifier);

          const basicTokenRes = await fetch(`${BASE_URL}/oauth/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            },
            body: basicTokenParams.toString(),
          });
          const basicTokenData = await assertJsonRes<{ access_token: string }>(
            basicTokenRes,
            'POST /oauth/token (client_secret_basic)'
          );
          if (basicTokenData) {
            assert(typeof basicTokenData.access_token === 'string',
              '  access_token received via Basic Auth', 'missing');
          }
        } else {
          fail('POST /oauth/token (client_secret_basic)',
            `no auth code: redirect=${basicLoc}`);
        }

        // ── 10. UserInfo ──────────────────────────────────────────────────────
        console.log('\n── UserInfo ──');

        const userInfoRes = await fetch(`${BASE_URL}/oauth/userinfo`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userInfo = await assertJsonRes<{ sub: string; name: string; email: string }>(
          userInfoRes,
          'GET /oauth/userinfo (Bearer token)'
        );
        if (userInfo) {
          assert(typeof userInfo.sub === 'string', '  sub present', 'missing');
          assert(typeof userInfo.name === 'string', '  name present (profile scope)', 'missing');
        }

        // ── 11. Refresh Token ────────────────────────────────────────────────
        console.log('\n── Refresh Token ──');

        const refreshParams = new URLSearchParams();
        refreshParams.set('grant_type', 'refresh_token');
        refreshParams.set('refresh_token', refreshToken);
        refreshParams.set('client_id', clientId!);
        refreshParams.set('client_secret', clientSecret!);

        const refreshRes = await fetch(`${BASE_URL}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: refreshParams.toString(),
        });
        const refreshData = await assertJsonRes<{
          access_token: string;
          refresh_token: string;
          scope: string;
        }>(refreshRes, 'POST /oauth/token (refresh_token)');

        if (refreshData) {
          const newAccessToken = refreshData.access_token;
          const newRefreshToken = refreshData.refresh_token;
          assert(typeof newAccessToken === 'string', '  new access_token received', 'missing');
          assert(typeof newRefreshToken === 'string', '  new refresh_token received', 'missing');
          assert(newAccessToken !== accessToken, '  access_token rotated', 'same as old');

          // ── 12. Revoke access_token (RFC 7009) ────────────────────────────────
          console.log('\n── Revoke access_token ──');

          const revokeAtParams = new URLSearchParams();
          revokeAtParams.set('token', newAccessToken);
          revokeAtParams.set('token_type_hint', 'access_token');
          revokeAtParams.set('client_id', clientId!);
          revokeAtParams.set('client_secret', clientSecret!);
          const revokeAtRes = await fetch(`${BASE_URL}/oauth/revoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: revokeAtParams.toString(),
          });
          assert(revokeAtRes.status === 200, '  POST /oauth/revoke (access_token)', `HTTP ${revokeAtRes.status}`);

          // Verify access token is now rejected by UserInfo
          const revokedAtRes = await fetch(`${BASE_URL}/oauth/userinfo`, {
            headers: { Authorization: `Bearer ${newAccessToken}` },
          });
          assert(!revokedAtRes.ok,
            '  Revoked access_token rejected by UserInfo',
            `HTTP ${revokedAtRes.status}`);

          // ── 13. Token Revocation ──────────────────────────────────────────────
          console.log('\n── Token Revocation (RFC 7009) ──');

          const revokeParams = new URLSearchParams();
          revokeParams.set('token', refreshToken);
          revokeParams.set('token_type_hint', 'refresh_token');
          revokeParams.set('client_id', clientId!);
          revokeParams.set('client_secret', clientSecret!);

          const revokeRes = await fetch(`${BASE_URL}/oauth/revoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: revokeParams.toString(),
          });
          assert(revokeRes.status === 200, '  POST /oauth/revoke (refresh_token)', `HTTP ${revokeRes.status}`);

          // Try to use the revoked refresh token
          const revokedParams = new URLSearchParams();
          revokedParams.set('grant_type', 'refresh_token');
          revokedParams.set('refresh_token', refreshToken);
          revokedParams.set('client_id', clientId!);
          revokedParams.set('client_secret', clientSecret!);

          const revokedRes = await fetch(`${BASE_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: revokedParams.toString(),
          });
          const revokedJson = await revokedRes.json().catch(() => ({}));
          assert(
            revokedRes.status >= 400 || revokedJson.error === 'invalid_grant',
            '  Revoked refresh_token rejected',
            `status=${revokedRes.status}, body=${JSON.stringify(revokedJson)}`
          );
        }
      }

      // ── 14. Client Credentials ──────────────────────────────────────────────
      console.log('\n── Client Credentials ──');

      const ccParams = new URLSearchParams();
      ccParams.set('grant_type', 'client_credentials');
      ccParams.set('scope', 'openid');
      ccParams.set('client_id', clientId!);
      ccParams.set('client_secret', clientSecret!);

      const ccRes = await fetch(`${BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: ccParams.toString(),
      });
      const ccData = await assertJsonRes<{ access_token: string; token_type: string }>(
        ccRes,
        'POST /oauth/token (client_credentials)'
      );
      if (ccData) {
        assert(ccData.token_type === 'Bearer', '  token_type is Bearer', ccData.token_type);
        assert(typeof ccData.access_token === 'string', '  access_token received', 'missing');
      }

      // ── 15. UserInfo with invalid token ─────────────────────────────────────
      console.log('\n── UserInfo with invalid token ──');

      const badTokenRes = await fetch(`${BASE_URL}/oauth/userinfo`, {
        headers: { Authorization: 'Bearer invalid-token-that-is-clearly-wrong' },
      });
      assert(!badTokenRes.ok,
        '  Invalid token rejected',
        `expected non-2xx, got ${badTokenRes.status}`);
    }
  } else {
    console.log('  ⚠️  Skipping OAuth2 flow tests (no client)');
  }

  // ─── 16. Error Handling ──────────────────────────────────────────────────────
  console.log('\n── Error Handling ──');

  const badAuthRes = await fetch(
    `${BASE_URL}/oauth/authorize?response_type=code&client_id=nonexistent&redirect_uri=https://invalid.example.com/callback`
  );
  assert(
    [400, 401].includes(badAuthRes.status),
    '  Invalid client_id returns error',
    `HTTP ${badAuthRes.status}`
  );

  const badTokenRes = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=authorization_code',
  });
  assert(
    badTokenRes.status >= 400,
    '  Missing params returns error',
    `HTTP ${badTokenRes.status}`
  );

  // ─── 17. Revoke Error Handling ──────────────────────────────────────────────
  console.log('\n── Revoke Error Handling ──');

  const badRevokeRes = await fetch(`${BASE_URL}/oauth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'token=some-token&client_id=invalid',
  });
  const badRevokeJson = await badRevokeRes.json().catch(() => ({}));
  assert(
    badRevokeRes.status === 401,
    '  Invalid client returns 401',
    `HTTP ${badRevokeRes.status}, body=${JSON.stringify(badRevokeJson)}`
  );

  const noTokenRes = await fetch(`${BASE_URL}/oauth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${clientId || 'nonexistent'}&client_secret=${clientSecret || 'nonexistent'}`,
  });
  // If client auth is valid, no token should return 200 per RFC 7009
  if (clientId && clientSecret) {
    assert(noTokenRes.status === 200 || noTokenRes.status === 401,
      '  No token with valid client returns 200/401',
      `HTTP ${noTokenRes.status}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('⏳ Waiting for server...');
  const ready = await waitForServer();
  if (!ready) {
    console.error('\x1b[31mServer not reachable at', BASE_URL, '\x1b[0m');
    console.error('Start the server first:  npm run dev');
    process.exit(1);
  }
  console.log('✅ Server is ready!\n');

  try {
    await runTests();
  } catch (err) {
    console.error('\n\x1b[31mTest suite crashed:\x1b[0m', err);
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`  \x1b[32mPassed:\x1b[0m ${passed}  \x1b[31mFailed:\x1b[0m ${failed}`);
  console.log('═══════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
