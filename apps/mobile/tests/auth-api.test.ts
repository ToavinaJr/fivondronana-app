import { afterEach, describe, expect, test, mock } from 'bun:test';
import { SessionExpiredError } from '../src/access/session';

mock.module('expo-constants', () => ({ default: { expoConfig: null } }));
const { login, refreshSession, requestPasswordRecovery, resolveApiBaseUrl } = await import('../src/access/auth-api');

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('mobile authentication API', () => {
  test('rejects non-loopback HTTP API URLs in release configuration', () => {
    expect(() => resolveApiBaseUrl('http://192.168.1.25:3000/api', undefined, false)).toThrow(
      'The mobile API must use HTTPS outside local development.',
    );
    expect(resolveApiBaseUrl('https://api.example.org/api', undefined, false)).toBe('https://api.example.org/api');
    expect(resolveApiBaseUrl('http://localhost:3000/api', undefined, false)).toBe('http://localhost:3000/api');
  });

  test('allows an explicitly configured LAN HTTP API only in development', () => {
    expect(resolveApiBaseUrl('http://192.168.1.25:3000/api', undefined, true)).toBe('http://192.168.1.25:3000/api');
  });

  test('sends the remember-me choice to the login endpoint', async () => {
    let requestBody = '';
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = String(init?.body ?? '');
      return Response.json({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 900,
        user: { id: 'u1', accountName: 'Tiana', email: null, phone: null },
      });
    }) as typeof fetch;

    await login('tiana@example.org', 'password-123', false);

    expect(JSON.parse(requestBody)).toEqual({
      identifier: 'tiana@example.org',
      password: 'password-123',
      rememberMe: false,
    });
  });

  test('maps rejected refresh tokens to an expired session', async () => {
    globalThis.fetch = (async () => new Response(null, { status: 401 })) as typeof fetch;
    await expect(refreshSession('refresh-token')).rejects.toBeInstanceOf(SessionExpiredError);
  });

  test('requests recovery without exposing whether an account exists', async () => {
    let requestBody = '';
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = String(init?.body ?? '');
      return new Response(JSON.stringify({ status: 'accepted' }), { status: 202 });
    }) as typeof fetch;

    await expect(requestPasswordRecovery('tiana@example.org')).resolves.toBeUndefined();
    expect(JSON.parse(requestBody)).toEqual({ email: 'tiana@example.org' });
  });
});
