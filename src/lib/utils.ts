import { randomBytes } from 'crypto';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.APP_URL || 'http://localhost:3000';
}

export function formatDate(date: Date | string | number, locale: string = 'zh-CN'): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date: Date | string | number, locale: string = 'zh-CN'): string {
  const d = new Date(date);
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;

  return formatDate(date);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function generateRandomString(length: number): string {
  const bytes = randomBytes(length);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  return usernameRegex.test(username);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'PASSWORD_TOO_SHORT';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'PASSWORD_NEEDS_LETTER_AND_NUMBER';
  return null;
}

export function validateNickname(nickname: unknown): string | null {
  if (nickname === undefined || nickname === null) return null;
  if (typeof nickname !== 'string' || nickname.trim().length === 0) return 'NICKNAME_EMPTY';
  if ((nickname as string).length > 50) return 'NICKNAME_TOO_LONG';
  return null;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
