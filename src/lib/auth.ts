import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { nanoid } from 'nanoid';
import { uuidv7 } from 'uuidv7';
import { cookies } from 'next/headers';
import { db } from './db';
import { getLocation } from './ip-location';
import { SESSION_COOKIE_NAME, DEFAULT_PAGE_SIZE } from './constants';
import { SECRET } from './secret';
const SESSION_EXPIRY = parseInt(process.env.SESSION_EXPIRY || '604800');
const MAX_IP_LENGTH = 45;

// Cache to avoid updating session IP/location on every request (5 min TTL per session+IP)
const _ipUpdateCache = new Map<string, number>();
const _IP_CACHE_TTL = 5 * 60 * 1000;
let _ipCacheLastCleanup = Date.now();

function cleanupIpCache() {
  const now = Date.now();
  if (now - _ipCacheLastCleanup < _IP_CACHE_TTL) return;
  _ipCacheLastCleanup = now;
  for (const [key, ts] of _ipUpdateCache) {
    if (now - ts > _IP_CACHE_TTL) {
      _ipUpdateCache.delete(key);
    }
  }
}

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

export interface AllSessionRecord extends Record<string, unknown> {
  id: string;
  user_id: string;
  username: string;
  email: string;
  nickname?: string | null;
  avatar?: string | null;
  role: string;
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
  const normalizedIp = normalizeIp(ip);

  // Get IP location and ISP info
  let ipLocation = '';
  let isp = '';
  if (normalizedIp) {
    try {
      const locInfo = await getLocation(normalizedIp);
      ipLocation = locInfo.location || '';
      isp = locInfo.isp || '';
    } catch {
      // Ignore location lookup errors
    }
  }

  await db.execute(
    'INSERT INTO sessions (id, user_id, ip, user_agent, ip_location, isp, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [sessionId, userId, normalizedIp ?? null, userAgent ?? null, ipLocation, isp, expiresAt]
  );

  return sessionId;
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY,
    path: '/',
  });
}

function normalizeIp(ip?: string | null): string | undefined {
  if (!ip) return undefined;
  const normalized = ip.split(',')[0]?.trim();
  if (!normalized || normalized.toLowerCase() === 'unknown') return undefined;
  if (normalized.length > MAX_IP_LENGTH) return undefined;
  return normalized;
}

export function getRequestMetadata(request: Request): { ip: string; userAgent: string } {
  // 优先级: CF-Connecting-IP (Cloudflare) > X-Forwarded-For > X-Real-IP
  const ip = normalizeIp(
    request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
  )
    || 'unknown';

  return {
    ip,
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

export async function getSession(sessionId: string, ip?: string): Promise<User | null> {
  const normalizedIp = normalizeIp(ip);
  const session = await db.getOne<SessionWithUserRow>(
    `SELECT s.*, u.id as user_id, u.username, u.email, u.nickname, u.avatar, u.role,
            u.email_verified, u.two_factor_enabled
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > NOW()`,
    [sessionId]
  );

  if (!session) return null;

  // Update IP and location if changed (throttled: max once per 5 min per session+IP)
  if (normalizedIp && session.ip !== normalizedIp) {
    cleanupIpCache();
    const cacheKey = `${sessionId}:${normalizedIp}`;
    const now = Date.now();
    const lastUpdate = _ipUpdateCache.get(cacheKey);
    if (!lastUpdate || now - lastUpdate > 5 * 60 * 1000) {
      _ipUpdateCache.set(cacheKey, now);
      try {
        const locInfo = await getLocation(normalizedIp);
        await db.execute(
          'UPDATE sessions SET ip = ?, ip_location = ?, isp = ? WHERE id = ?',
          [normalizedIp, locInfo.location || '', locInfo.isp || '', sessionId]
        );
      } catch {
        // If location lookup fails, just update IP
        await db.execute('UPDATE sessions SET ip = ? WHERE id = ?', [normalizedIp, sessionId]);
      }
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

export async function deleteExpiredSessions(): Promise<void> {
  await db.execute('DELETE FROM sessions WHERE expires_at <= NOW()');
}

export async function getUserSessions(userId: string): Promise<UserSessionRecord[]> {
  // Clean up expired sessions in the background (fire-and-forget)
  deleteExpiredSessions().catch(() => {});
  return db.query<UserSessionRecord>(
    'SELECT id, ip, user_agent, ip_location, isp, created_at, expires_at FROM sessions WHERE user_id = ? AND expires_at > NOW() ORDER BY created_at DESC',
    [userId]
  );
}

export async function getAllSessions(page: number = 1, limit: number = DEFAULT_PAGE_SIZE, search?: string): Promise<{ sessions: AllSessionRecord[]; total: number }> {
  // Clean up expired sessions in the background (fire-and-forget)
  deleteExpiredSessions().catch(() => {});
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Only show non-expired sessions
  conditions.push('s.expires_at > NOW()');

  if (search) {
    conditions.push('(u.username LIKE ? OR u.email LIKE ? OR s.ip LIKE ? OR s.user_agent LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const [sessions, countResult] = await Promise.all([
    db.query<AllSessionRecord>(
      `SELECT s.id, s.user_id, u.username, u.email, u.nickname, u.avatar, u.role,
              s.ip, s.user_agent, s.ip_location, s.isp, s.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    db.getOne<CountRow>(
      `SELECT COUNT(*) as total FROM sessions s JOIN users u ON s.user_id = u.id ${whereClause}`,
      params
    )
  ]);

  return {
    sessions,
    total: countResult?.total || 0,
  };
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

/**
 * 存储注册验证码（关联邮箱，不创建用户）
 */
export async function storePendingCode(email: string): Promise<string> {
  // 先删除该邮箱旧的验证码
  await db.execute('DELETE FROM pending_codes WHERE email = ?', [email]);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY * 1000);

  await db.execute(
    'INSERT INTO pending_codes (email, code, expires_at) VALUES (?, ?, ?)',
    [email, code, expiresAt]
  );

  return code;
}

/**
 * 验证注册验证码（验证码+邮箱双重匹配，不创建用户，仅返回是否匹配）
 */
export async function verifyPendingCode(code: string, email: string): Promise<boolean> {
  const row = await db.getOne<{ email: string }>(
    'SELECT email FROM pending_codes WHERE code = ? AND email = ? AND expires_at > NOW()',
    [code, email]
  );

  if (!row) return false;

  // 删除已使用的验证码
  await db.execute('DELETE FROM pending_codes WHERE code = ? AND email = ?', [code, email]);

  return true;
}

/**
 * 完善用户注册信息（用户名、密码、昵称）并标记已验证
 */
export async function completeUserRegistration(userId: string, username: string, password: string, nickname?: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  const displayNickname = nickname || username;

  await db.execute(
    'UPDATE users SET username = ?, password_hash = ?, nickname = ?, email_verified = TRUE WHERE id = ?',
    [username, passwordHash, displayNickname, userId]
  );
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

export async function updateUser(id: string, data: { username?: string; nickname?: string; avatar?: string | null; email?: string; email_verified?: boolean }): Promise<void> {
  const fields: string[] = [];
  const values: (string | null | boolean)[] = [];

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
  if (data.email_verified !== undefined) {
    fields.push('email_verified = ?');
    values.push(data.email_verified);
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

// ===== Email Verification =====

const EMAIL_VERIFICATION_EXPIRY = parseInt(process.env.EMAIL_VERIFICATION_EXPIRY || '600'); // 10 minutes for code
const PASSWORD_RESET_EXPIRY = parseInt(process.env.PASSWORD_RESET_EXPIRY || '1800'); // 30 minutes

/**
 * 生成 6 位数字邮箱验证码并存入数据库
 */
export async function createEmailVerificationCode(userId: string): Promise<string> {
  // 先删除该用户旧的验证码
  await db.execute('DELETE FROM email_verifications WHERE user_id = ?', [userId]);

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY * 1000);

  await db.execute(
    'INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, code, expiresAt]
  );

  return code;
}

/**
 * 验证邮箱验证码，成功后返回 userId 并删除验证码
 */
export async function verifyEmailCode(code: string, email: string): Promise<string | null> {
  // 通过邮箱 + 验证码双重匹配，防止验证码滥用
  const row = await db.getOne<{ user_id: string }>(
    `SELECT ev.user_id
     FROM email_verifications ev
     JOIN users u ON ev.user_id = u.id
     WHERE ev.token = ? AND u.email = ? AND ev.expires_at > NOW()`,
    [code, email]
  );

  if (!row) return null;

  const userId = row.user_id;

  // 标记邮箱为已验证
  await db.execute('UPDATE users SET email_verified = TRUE WHERE id = ?', [userId]);

  // 删除已使用的验证码及过期记录
  await db.execute('DELETE FROM email_verifications WHERE user_id = ? OR expires_at <= NOW()', [userId]);

  return userId;
}

/**
 * 生成密码重置 Token 并存入数据库
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY * 1000);

  // 删除旧的密码重置 Token
  await db.execute('DELETE FROM password_resets WHERE user_id = ?', [userId]);

  await db.execute(
    'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );

  return token;
}

/**
 * 验证密码重置 Token，成功后返回 userId 并删除 Token
 */
export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const row = await db.getOne<{ user_id: string }>(
    'SELECT user_id FROM password_resets WHERE token = ? AND expires_at > NOW()',
    [token]
  );

  if (!row) return null;

  // 删除已使用的 Token
  await db.execute('DELETE FROM password_resets WHERE token = ?', [token]);

  return row.user_id;
}

/**
 * 检查邮箱是否已被验证
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await db.getOne<{ email_verified: boolean }>(
    'SELECT email_verified FROM users WHERE id = ?',
    [userId]
  );
  return user?.email_verified || false;
}
