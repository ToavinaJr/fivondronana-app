import { timingSafeEqual } from 'node:crypto';

export const ACCESS_COOKIE = '__Host-fivondronana-access';
export const REFRESH_COOKIE = '__Host-fivondronana-refresh';
export const CSRF_COOKIE = '__Host-fivondronana-csrf';

export type BrowserHeaders = {
  cookie?: string;
  origin?: string;
  'x-csrf-token'?: string;
};

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const matches = header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`));
  if (matches.length !== 1) return undefined;
  const value = matches[0]?.slice(name.length + 1);
  return value || undefined;
}

export function browserMutationAllowed(method: string, headers: BrowserHeaders, allowedOrigins: string[]): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) return true;
  const csrfCookie = readCookie(headers.cookie, CSRF_COOKIE);
  const suppliedToken = headers['x-csrf-token'];
  const origin = headers.origin;
  if (!csrfCookie || !suppliedToken || !origin || !allowedOrigins.includes(origin)) return false;
  const expected = Buffer.from(csrfCookie);
  const actual = Buffer.from(suppliedToken);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function serializeSessionCookie(name: string, value: string, maxAgeSeconds: number, httpOnly = true): string {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (httpOnly) parts.push('HttpOnly');
  return parts.join('; ');
}

export function clearSessionCookies(): string[] {
  return [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE].map((name) =>
    serializeSessionCookie(name, '', 0, name !== CSRF_COOKIE),
  );
}
