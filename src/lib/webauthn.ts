import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { db } from './db';
import { nanoid } from 'nanoid';
import { getAuthenticatorInfo } from './aaguids';

const rpName = process.env.WEBAUTHN_RP_NAME || 'Sakura Account';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

export async function getAuthenticators(userId: string) {
  const credentials = await db.query(
    'SELECT * FROM webauthn_credentials WHERE user_id = ?',
    [userId]
  );

  return credentials.map(cred => ({
    id: cred.credential_id,
    publicKey: Buffer.from(cred.public_key, 'base64'),
    counter: cred.counter,
    transports: cred.transports ? JSON.parse(cred.transports) : [],
  }));
}

export async function generateRegistration(userId: string, username: string, displayName?: string) {
  const authenticators = await getAuthenticators(userId);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: Buffer.from(userId),
    userName: username,
    userDisplayName: displayName || username,
    attestationType: 'none',
    excludeCredentials: authenticators.map(auth => ({
      id: auth.id,
      type: 'public-key' as const,
      transports: auth.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });

  return options;
}

export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  credentialName?: string
) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (verification.verified && verification.registrationInfo) {
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const existingCredential = await db.getOne(
      'SELECT id FROM webauthn_credentials WHERE credential_id = ?',
      [Buffer.from(credential.id).toString('base64')]
    );

    if (!existingCredential) {
      const aaguid = (verification.registrationInfo as any).aaguid || undefined;

      await db.execute(
        `INSERT INTO webauthn_credentials (id, user_id, credential_id, public_key, counter, device_type, backup_eligible, backup_state, transports, name, aaguid, last_used)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          nanoid(32),
          userId,
          Buffer.from(credential.id).toString('base64'),
          Buffer.from(credential.publicKey).toString('base64'),
          credential.counter,
          credentialDeviceType,
          credentialBackedUp,
          credentialBackedUp,
          JSON.stringify(response.response?.transports || []),
          credentialName || 'Passkey',
          aaguid || null,
        ]
      );
    }
  }

  return verification;
}

export async function generateAuthentication(userId?: string) {
  let authenticators: any[] = [];

  if (userId) {
    authenticators = await getAuthenticators(userId);
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials: authenticators.map(auth => ({
      id: auth.id,
      type: 'public-key' as const,
      transports: auth.transports as AuthenticatorTransportFuture[],
    })),
  });

  return options;
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string
) {
  const credential = await db.getOne(
    'SELECT * FROM webauthn_credentials WHERE credential_id = ?',
    [Buffer.from(response.id).toString('base64')]
  );

  if (!credential) {
    return { verified: false, userId: null };
  }

  const authenticator = {
    id: credential.credential_id,
    publicKey: Buffer.from(credential.public_key, 'base64'),
    counter: credential.counter,
    transports: credential.transports ? JSON.parse(credential.transports) : [],
  };

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: authenticator,
  });

  if (verification.verified) {
    await db.execute(
      'UPDATE webauthn_credentials SET counter = ?, last_used = CURRENT_TIMESTAMP WHERE id = ?',
      [verification.authenticationInfo.newCounter, credential.id]
    );
  }

  return {
    verified: verification.verified,
    userId: credential.user_id,
  };
}

export async function removeCredential(credentialId: string, userId: string): Promise<boolean> {
  const result = await db.execute(
    'DELETE FROM webauthn_credentials WHERE id = ? AND user_id = ?',
    [credentialId, userId]
  );

  return result.affectedRows > 0 || result.rowCount > 0;
}

export async function getUserCredentials(userId: string) {
  const rows = await db.query(
    'SELECT id, name, device_type, backup_state, aaguid, created_at, last_used FROM webauthn_credentials WHERE user_id = ?',
    [userId]
  );

  return rows.map((cred: any) => {
    const info = getAuthenticatorInfo(cred.aaguid);
    return {
      id: cred.id,
      name: cred.name || null,
      device_type: cred.device_type,
      backup_state: cred.backup_state,
      aaguid: cred.aaguid || null,
      providerName: info.name,
      providerIcon: info.icon,
      created_at: cred.created_at,
      last_used: cred.last_used,
    };
  });
}
