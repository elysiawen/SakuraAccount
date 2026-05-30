import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { nanoid } from 'nanoid';
import { uuidv7 } from 'uuidv7';
import { cookies } from 'next/headers';
import { db } from './db';
import { getLocation } from './ip-location';
import { SESSION_COOKIE_NAME, DEFAULT_PAGE_SIZE } from './constants';

const APP_SECRET = process.env.APP_SECRET;
if (!APP_SECRET) {
  throw new Error('FATAL: APP_SECRET environment variable is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}
const SECRET = new TextEncoder().encode(APP_SECRET);
const SESSION_EXPIRY = parseInt(process.env.SESSION_EXPIRY || '604800');

import type { User } from '@/types';
export type { User };

export interface Session {
  id: string;
  userId: string;
  ip?: string;
  userAgent?: string;
  expiresAt: Date;
}

interface DbUserRow extends Record<string, unknown> {
  id: string;
  username: string;
  email: string;
  password_hash?: string | null;
  nickname?: string | null;
  avatar?: string | null;
  role: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  created_at?: string;
}

interface SessionWithUserRow extends Record<string, unknown> {
  user_id: string;
  username: string;
  email: string;
  nickname?: string | null;
  avatar?: string | null;
  role: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  ip?: string | null;
}

export interface UserSessionRecord extends Record<string, unknown> {
  id: string;
  ip?: string | null;
  user_agent?: string | null;
  ip_location?: string | null;
  isp?: string | null;
  created_at: string;
  expires_at: string;
}

export interface AuditLogRecord extends Record<string, unknown> {
  id: number;
  user_id?: string | null;
  category: string;
  action: string;
  details?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  created_at: string;
  username?: string | null;
}

interface CountRow extends Record<string, unknown> {
  total?: number;
  count?: number;
}

export interface UserListItem extends Record<string, unknown> {
  id: string;
  username: string;
  email: string;
  nickname?: string | null;
  avatar?: string | null;
  role: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  created_at: string;
}

export interface UserSearchItem extends Record<string, unknown> {
  id: string;
  username: string;
  email: string;
  nickname?: string | null;
  role: string;
  created_at: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createJWT(payload: JWTPayload, expiresIn: string = '7d'): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, ip?: string, userAgent?: string): Promise<string> {
  const sessionId = nanoid(32);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY * 1000);

  // Get IP location and ISP info
  let ipLocation = '';
  let isp = '';
  if (ip) {
    try {
      const locInfo = await getLocation(ip);
      ipLocation = locInfo.location || '';
      isp = locInfo.isp || '';
    } catch {
      // Ignore location lookup errors
    }
  }

  await db.execute(
    'INSERT INTO sessions (id, user_id, ip, user_agent, ip_location, isp, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [sessionId, userId, ip ?? null, userAgent ?? null, ipLocation, isp, expiresAt]
  );

  return sessionId;
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_EXPIRY,
    path: '/',
  });
}

export function getRequestMetadata(request: Request): { ip: string; userAgent: string } {
  // 优先级: CF-Connecting-IP (Cloudflare) > X-Forwarded-For > X-Real-IP
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  return {
    ip,
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

export async function getSession(sessionId: string, ip?: string): Promise<User | null> {
  const session = await db.getOne<SessionWithUserRow>(
    `SELECT s.*, u.id as user_id, u.username, u.email, u.nickname, u.avatar, u.role,
            u.email_verified, u.two_factor_enabled
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > NOW()`,
    [sessionId]
  );

  if (!session) return null;

  // Update IP and location if changed
  if (ip && session.ip !== ip) {
    try {
      const locInfo = await getLocation(ip);
      await db.execute(
        'UPDATE sessions SET ip = ?, ip_location = ?, isp = ? WHERE id = ?',
        [ip, locInfo.location || '', locInfo.isp || '', sessionId]
      );
    } catch {
      // If location lookup fails, just update IP
      await db.execute('UPDATE sessions SET ip = ? WHERE id = ?', [ip, sessionId]);
    }
  }

  return {
    id: session.user_id,
    username: session.username,
    email: session.email,
    nickname: session.nickname ?? undefined,
    avatar: session.avatar ?? undefined,
    role: session.role,
    emailVerified: session.email_verified,
    twoFactorEnabled: session.two_factor_enabled,
  };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
}

export async function sessionBelongsToUser(sessionId: string, userId: string): Promise<boolean> {
  const session = await db.getOne<{ user_id: string }>(
    'SELECT user_id FROM sessions WHERE id = ?',
    [sessionId]
  );
  return session?.user_id === userId;
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await db.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

export async function getUserSessions(userId: string): Promise<UserSessionRecord[]> {
  return db.query<UserSessionRecord>(
    'SELECT id, ip, user_agent, ip_location, isp, created_at, expires_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
}

export async function logAudit(userId: string | null, action: string, details?: unknown, ip?: string, userAgent?: string, category: string = 'operation'): Promise<void> {
  await db.execute(
    'INSERT INTO audit_logs (user_id, category, action, details, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, category, action, JSON.stringify(details), ip ?? null, userAgent ?? null]
  );
}

export async function getAuditLogs(page: number = 1, limit: number = DEFAULT_PAGE_SIZE, category?: string, search?: string): Promise<{ logs: AuditLogRecord[]; total: number }> {
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (category) {
    conditions.push('al.category = ?');
    params.push(category);
  }
  if (search) {
    conditions.push('(u.username LIKE ? OR al.action LIKE ? OR al.ip LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [logs, countResult] = await Promise.all([
    db.query<AuditLogRecord>(
      `SELECT al.*, u.username
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    db.getOne<CountRow>(
      `SELECT COUNT(*) as total FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereClause}`,
      params
    )
  ]);

  return {
    logs,
    total: countResult?.total || 0,
  };
}

export async function cleanupAuditLogs(retentionDays: number, categories?: string[]): Promise<{ deleted: number }> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (retentionDays > 0) {
    conditions.push('created_at < ?');
    params.push(new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString());
  }

  if (categories && categories.length > 0) {
    conditions.push(`category IN (${categories.map(() => '?').join(', ')})`);
    params.push(...categories);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const count = await db.getOne<CountRow>(`SELECT COUNT(*) as count FROM audit_logs ${whereClause}`, params);
  await db.execute(`DELETE FROM audit_logs ${whereClause}`, params);
  return { deleted: count?.count || 0 };
}

export async function createUser(username: string, email: string, password: string, nickname?: string): Promise<User> {
  const userId = uuidv7();
  const passwordHash = await hashPassword(password);

  await db.execute(
    'INSERT INTO users (id, username, email, password_hash, nickname) VALUES (?, ?, ?, ?, ?)',
    [userId, username, email, passwordHash, nickname || username]
  );

  return {
    id: userId,
    username,
    email,
    nickname: nickname || username,
    role: 'user',
    emailVerified: false,
    twoFactorEnabled: false,
  };
}

export async function getUserByUsername(username: string): Promise<DbUserRow | null> {
  return db.getOne<DbUserRow>('SELECT * FROM users WHERE username = ?', [username]);
}

export async function getUserByEmail(email: string): Promise<DbUserRow | null> {
  return db.getOne<DbUserRow>('SELECT * FROM users WHERE email = ?', [email]);
}

export async function getUserById(id: string): Promise<DbUserRow | null> {
  return db.getOne<DbUserRow>('SELECT * FROM users WHERE id = ?', [id]);
}

export async function updateUser(id: string, data: { username?: string; nickname?: string; avatar?: string | null; email?: string }): Promise<void> {
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (data.username !== undefined) {
    fields.push('username = ?');
    values.push(data.username);
  }
  if (data.nickname !== undefined) {
    fields.push('nickname = ?');
    values.push(data.nickname);
  }
  if (data.avatar !== undefined) {
    fields.push('avatar = ?');
    values.push(data.avatar);
  }
  if (data.email !== undefined) {
    fields.push('email = ?');
    values.push(data.email);
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function updateUserPassword(id: string, password: string): Promise<void> {
  const hash = await hashPassword(password);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
}

export async function updateUserRole(id: string, role: string): Promise<void> {
  await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
}

export async function deleteUser(id: string): Promise<void> {
  await db.execute('DELETE FROM users WHERE id = ?', [id]);
}

export async function getAllUsers(page: number = 1, limit: number = DEFAULT_PAGE_SIZE): Promise<{ users: UserListItem[]; total: number }> {
  const offset = (page - 1) * limit;

  const [users, countResult] = await Promise.all([
    db.query<UserListItem>(
      'SELECT id, username, email, nickname, avatar, role, email_verified, two_factor_enabled, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    ),
    db.getOne<CountRow>('SELECT COUNT(*) as total FROM users')
  ]);

  return {
    users,
    total: countResult?.total || 0,
  };
}

export async function searchUsers(query: string): Promise<UserSearchItem[]> {
  return db.query<UserSearchItem>(
    `SELECT id, username, email, nickname, role, created_at
     FROM users
     WHERE username LIKE ? OR email LIKE ? OR nickname LIKE ?
     LIMIT 10`,
    [`%${query}%`, `%${query}%`, `%${query}%`]
  );
}
