import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { AddressInfo } from 'node:net';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApiApp } from '../src/api-bootstrap.js';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/auth.crypto.js';
import { PrismaService } from '../src/modules/database/prisma.service.js';

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
const testDatabaseName = testDatabaseUrl ? new URL(testDatabaseUrl).pathname.replace(/^\//, '') : '';
if (testDatabaseUrl && !testDatabaseName.toLowerCase().endsWith('_test')) {
  throw new Error('DATABASE_URL_TEST must point to a database whose name ends with _test.');
}

describe.skipIf(!testDatabaseUrl)('NestJS HTTP API with PostgreSQL', () => {
  const testJwtSecret = 'integration-test-secret-that-is-not-used-outside-tests';
  let app: NestExpressApplication | undefined;
  let prisma: PrismaService;
  let baseUrl: string;
  let userId: string;
  let email: string;
  let previousDatabaseUrl: string | undefined;
  let previousJwtSecret: string | undefined;

  beforeAll(async () => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    previousJwtSecret = process.env.JWT_SECRET;
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.JWT_SECRET = testJwtSecret;

    app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
    configureApiApp(app);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    prisma = app.get(PrismaService);

    email = `http-${crypto.randomUUID()}@fivondronana.test`;
    const user = await prisma.user.create({
      data: {
        accountName: 'HTTP Integration',
        email,
        emailNormalized: email,
        phone: null,
        phoneNormalized: null,
        passwordHash: await hashPassword('integration-password'),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await app?.close();
    restoreEnvironment('DATABASE_URL', previousDatabaseUrl);
    restoreEnvironment('JWT_SECRET', previousJwtSecret);
  });

  test('serves the health endpoint over HTTP', async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  test('logs in, exposes the current user, and omits password hashes', async () => {
    const session = await login();
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: userId,
      accountName: 'HTTP Integration',
      email,
      phone: null,
      hasAvatar: false,
      isResponsible: false,
    });
    expect(session.user).not.toHaveProperty('passwordHash');
  });

  test('rotates a refresh token and rejects reuse of the old token', async () => {
    const session = await login();
    const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    const rotated = (await refreshResponse.json()) as { accessToken: string; refreshToken: string };
    const replay = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });

    expect(refreshResponse.status).toBe(200);
    expect(rotated.accessToken).not.toBe(session.accessToken);
    expect(rotated.refreshToken).not.toBe(session.refreshToken);
    expect(replay.status).toBe(401);
  });

  test('returns the shared error contract for invalid request bodies', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 5, password: 'x', unexpected: true }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      path: '/api/auth/login',
      message: expect.any(Array),
    });
  });

  test('persists the authenticated user CV through HTTP and reads it back', async () => {
    const session = await login();
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    };
    const cv = {
      firstName: 'Tiana',
      lastName: 'Rabe',
      address: 'Antananarivo',
      birthDate: '1990-01-01',
      phone: '0341234567',
      email,
      province: 'Analamanga',
      area: 'Avaradrano',
      fivondronana: 'Antananarivo',
      branches: [{ name: 'Tily', group: 'Mpanazava', project: 'Test' }],
      activities: [{ name: 'Fanompoana', responsibility: 'Mpitarika' }],
    };
    const saveResponse = await fetch(`${baseUrl}/api/cvs/me`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(cv),
    });
    const saved = (await saveResponse.json()) as { firstName: string; branches: Array<{ name: string }> };
    const readResponse = await fetch(`${baseUrl}/api/cvs/me`, { headers: { Authorization: headers.Authorization } });
    const read = (await readResponse.json()) as { firstName: string; branches: Array<{ name: string }> };

    expect(saveResponse.status).toBe(200);
    expect(saved.firstName).toBe('Tiana');
    expect(readResponse.status).toBe(200);
    expect(read.firstName).toBe('Tiana');
    expect(read.branches.map((branch) => branch.name)).toEqual(['Tily']);
  });

  test('revokes a logged-out session on the next request', async () => {
    const session = await login();
    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    expect(logoutResponse.status).toBe(200);
    expect(meResponse.status).toBe(401);
    expect(await meResponse.json()).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
  });

  async function login(): Promise<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }> {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password: 'integration-password' }),
    });
    expect(response.status).toBe(200);
    return response.json() as Promise<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }>;
  }
});

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
