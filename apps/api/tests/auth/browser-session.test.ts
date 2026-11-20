import { describe, expect, test } from 'bun:test';
import {
  browserMutationAllowed,
  clearSessionCookies,
  readCookie,
  serializeSessionCookie,
} from '../../src/modules/auth/browser-session.js';

describe('browser session cookie policy', () => {
  test('marks session credentials HttpOnly and Secure while keeping only the CSRF token readable', () => {
    const access = serializeSessionCookie('__Host-fivondronana-access', 'access-token', 900);
    const csrf = serializeSessionCookie('__Host-fivondronana-csrf', 'csrf-token', 86_400, false);

    expect(access).toContain('Secure');
    expect(access).toContain('HttpOnly');
    expect(access).toContain('SameSite=Lax');
    expect(access).toContain('Path=/');
    expect(csrf).toContain('Secure');
    expect(csrf).not.toContain('HttpOnly');
    expect(clearSessionCookies()).toHaveLength(3);
  });

  test('rejects duplicate cookie names instead of selecting an ambiguous value', () => {
    expect(readCookie('session=first; session=second', 'session')).toBeUndefined();
  });

  test('requires exact origin and matching CSRF token for unsafe browser methods', () => {
    const headers = {
      cookie: '__Host-fivondronana-csrf=nonce-value',
      origin: 'https://admin.example.test',
      'x-csrf-token': 'nonce-value',
    };
    expect(browserMutationAllowed('POST', headers, ['https://admin.example.test'])).toBe(true);
    expect(browserMutationAllowed('DELETE', headers, ['https://evil.example.test'])).toBe(false);
    expect(browserMutationAllowed('PUT', { ...headers, 'x-csrf-token': 'wrong' }, ['https://admin.example.test'])).toBe(
      false,
    );
    expect(browserMutationAllowed('GET', {}, [])).toBe(true);
  });
});
