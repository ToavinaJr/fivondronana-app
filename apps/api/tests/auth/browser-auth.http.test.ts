import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { AddressInfo } from 'node:net';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApiApp } from '../../src/api-bootstrap.js';
import { AccessTokenGuard } from '../../src/modules/auth/access-token.guard.js';
import { AuthController } from '../../src/modules/auth/auth.controller.js';
import { issueAccessToken } from '../../src/modules/auth/auth.crypto.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';

const secret = 'browser-auth-http-test-secret-with-more-than-32-characters';
const user = { id: 'admin-1', accountName: 'Admin', email: 'admin@example.test', phone: null };
let activeSessionId = 'browser-session-1';
let loginCallCount = 0;
let revokeCallCount = 0;
let app: NestExpressApplication;
let baseUrl: string;
let previousSecret: string | undefined;
let previousOrigins: string | undefined;

const authService = {
  login: async () => {
    loginCallCount += 1;
    activeSessionId = 'browser-session-1';
    return issueSession(activeSessionId, 'refresh-token-000000000000000000000000000000000000000000000000000000000000');
  },
  refresh: async (refreshToken: string) => {
    expect(refreshToken).toBe('refresh-token-000000000000000000000000000000000000000000000000000000000000');
    activeSessionId = 'browser-session-2';
    return issueSession(activeSessionId, 'refresh-token-111111111111111111111111111111111111111111111111111111111111');
  },
  getSession: async (id: string) => ({
    id,
    userId: user.id,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: { ...user, isActive: true, roles: [] },
  }),
  getBrowserIdentity: async () => ({ ...user, roles: ['ADMINISTRATOR'] }),
  revokeRefreshToken: async () => {
    revokeCallCount += 1;
  },
};

@Module({
  controllers: [AuthController],
  providers: [{ provide: AuthService, useValue: authService }, AccessTokenGuard],
})
class BrowserAuthModule {}

describe('browser authentication HTTP contract', () => {
  beforeAll(async () => {
    previousSecret = process.env.JWT_SECRET;
    previousOrigins = process.env.CORS_ALLOWED_ORIGINS;
    process.env.JWT_SECRET = secret;
    process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:5173';
    app = await NestFactory.create<NestExpressApplication>(BrowserAuthModule, { logger: false });
    configureApiApp(app);
    await app.listen(0, '127.0.0.1');
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await app?.close();
    restoreEnvironment('JWT_SECRET', previousSecret);
    restoreEnvironment('CORS_ALLOWED_ORIGINS', previousOrigins);
  });

  test('sets HttpOnly Secure session cookies and returns no bearer credentials to JavaScript', async () => {
    const response = await fetch(`${baseUrl}/api/auth/browser/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: JSON.stringify({ identifier: 'admin@example.test', password: 'correct-password', rememberMe: true }),
    });
    const payload = (await response.json()) as Record<string, unknown>;
    const cookies = response.headers.getSetCookie();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ user, csrfToken: expect.any(String), expiresIn: 900 });
    expect(payload).not.toHaveProperty('accessToken');
    expect(payload).not.toHaveProperty('refreshToken');
    expect(cookies.find((cookie) => cookie.startsWith('__Host-fivondronana-access='))).toContain('HttpOnly');
    expect(cookies.find((cookie) => cookie.startsWith('__Host-fivondronana-access='))).toContain('Secure;');
    expect(cookies.find((cookie) => cookie.startsWith('__Host-fivondronana-refresh='))).toContain('HttpOnly');
    expect(cookies.find((cookie) => cookie.startsWith('__Host-fivondronana-csrf='))).not.toContain('HttpOnly');
  });

  test('rejects cross-origin browser login before checking credentials', async () => {
    const previousCalls = loginCallCount;
    const response = await fetch(`${baseUrl}/api/auth/browser/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example.test' },
      body: JSON.stringify({ identifier: 'admin@example.test', password: 'correct-password' }),
    });
    expect(response.status).toBe(403);
    expect(loginCallCount).toBe(previousCalls);
  });

  test('blocks untrusted-origin browser refresh before rotating the session', async () => {
    const response = await fetch(`${baseUrl}/api/auth/browser/refresh`, {
      method: 'POST',
      headers: {
        Cookie: '__Host-fivondronana-refresh=refresh-token; __Host-fivondronana-csrf=csrf',
        Origin: 'https://evil.example.test',
        'X-CSRF-Token': 'csrf',
      },
    });
    expect(response.status).toBe(403);
  });

  test('rotates the browser refresh cookie and returns no token to JavaScript', async () => {
    const login = await fetch(`${baseUrl}/api/auth/browser/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: JSON.stringify({ identifier: 'admin@example.test', password: 'correct-password' }),
    });
    const loginBody = (await login.json()) as { csrfToken: string };
    const loginCookies = login.headers.getSetCookie();
    const cookieHeader = loginCookies.map((cookie) => cookie.split(';', 1)[0]).join('; ');

    const response = await fetch(`${baseUrl}/api/auth/browser/refresh`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
        Origin: 'http://localhost:5173',
        'X-CSRF-Token': loginBody.csrfToken,
      },
    });
    const payload = (await response.json()) as Record<string, unknown>;
    const rotatedRefreshCookie = response.headers
      .getSetCookie()
      .find((cookie) => cookie.startsWith('__Host-fivondronana-refresh='));

    expect(response.status).toBe(200);
    expect(payload).not.toHaveProperty('accessToken');
    expect(payload).not.toHaveProperty('refreshToken');
    expect(rotatedRefreshCookie).toContain(
      'refresh-token-111111111111111111111111111111111111111111111111111111111111',
    );
  });

  test('rejects browser logout without CSRF proof and does not revoke the session', async () => {
    const revokeCallsBefore = revokeCallCount;
    const response = await fetch(`${baseUrl}/api/auth/browser/logout`, {
      method: 'POST',
      headers: {
        Cookie:
          '__Host-fivondronana-access=access-token; __Host-fivondronana-refresh=refresh-token; __Host-fivondronana-csrf=csrf-token',
        Origin: 'http://localhost:5173',
      },
    });

    expect(response.status).toBe(403);
    expect(revokeCallCount).toBe(revokeCallsBefore);
  });

  test('authenticates the admin through its cookie and revokes the browser session on logout', async () => {
    const accessToken = issueAccessToken(user.id, activeSessionId, secret).token;
    const cookies = [
      `__Host-fivondronana-access=${accessToken}`,
      '__Host-fivondronana-refresh=refresh-token-000000000000000000000000000000000000000000000000000000000000',
      '__Host-fivondronana-csrf=csrf-nonce',
    ].join('; ');
    const identity = await fetch(`${baseUrl}/api/auth/browser/me`, { headers: { Cookie: cookies } });
    expect(identity.status).toBe(200);
    expect(await identity.json()).toMatchObject({
      user: { id: user.id, roles: ['ADMINISTRATOR'] },
      csrfToken: 'csrf-nonce',
    });

    const logout = await fetch(`${baseUrl}/api/auth/browser/logout`, {
      method: 'POST',
      headers: { Cookie: cookies, Origin: 'http://localhost:5173', 'X-CSRF-Token': 'csrf-nonce' },
    });
    expect(logout.status).toBe(200);
    expect(logout.headers.getSetCookie().every((cookie) => cookie.includes('Max-Age=0'))).toBe(true);
  });
});

function issueSession(sessionId: string, refreshToken: string) {
  const access = issueAccessToken(user.id, sessionId, secret);
  return {
    accessToken: access.token,
    refreshToken,
    tokenType: 'Bearer' as const,
    expiresIn: 900,
    refreshExpiresIn: 30 * 24 * 60 * 60,
    user,
  };
}

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
