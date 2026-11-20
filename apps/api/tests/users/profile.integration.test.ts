import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { AddressInfo } from 'node:net';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApiApp } from '../../src/api-bootstrap.js';
import { AppModule } from '../../src/app.module.js';
import { hashPassword } from '../../src/modules/auth/auth.crypto.js';
import { PrismaService } from '../../src/modules/database/prisma.service.js';

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
const testDatabaseName = testDatabaseUrl ? new URL(testDatabaseUrl).pathname.replace(/^\//, '') : '';
if (testDatabaseUrl && !testDatabaseName.toLowerCase().endsWith('_test')) {
  throw new Error('DATABASE_URL_TEST must point to a database whose name ends with _test.');
}

describe.skipIf(!testDatabaseUrl)('self-service profile over HTTP', () => {
  let app: NestExpressApplication | undefined;
  let prisma: PrismaService;
  let baseUrl: string;
  let userId: string;
  let accessToken: string;
  let previousDatabaseUrl: string | undefined;
  let previousJwtSecret: string | undefined;

  beforeAll(async () => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    previousJwtSecret = process.env.JWT_SECRET;
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.JWT_SECRET = 'profile-integration-test-secret-that-is-not-used-outside-tests';

    app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
    configureApiApp(app);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    prisma = app.get(PrismaService);

    const email = `profile-${crypto.randomUUID()}@fivondronana.test`;
    const user = await prisma.user.create({
      data: {
        accountName: 'Profile Integration',
        email,
        emailNormalized: email,
        passwordHash: await hashPassword('integration-password'),
      },
    });
    userId = user.id;
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password: 'integration-password' }),
    });
    ({ accessToken } = (await login.json()) as { accessToken: string });
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await app?.close();
    restoreEnvironment('DATABASE_URL', previousDatabaseUrl);
    restoreEnvironment('JWT_SECRET', previousJwtSecret);
  });

  test('renames the account and reflects the new name on the authenticated identity', async () => {
    const response = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountName: '  Renamed Leader  ' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ accountName: 'Renamed Leader', hasAvatar: false });

    const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
    expect(await me.json()).toMatchObject({ accountName: 'Renamed Leader', hasAvatar: false });
  });

  test('rejects a non-image avatar, then uploads, serves, and removes a real PNG', async () => {
    const badForm = new FormData();
    badForm.append('file', new Blob([Buffer.from('not a png')], { type: 'image/png' }), 'fake.png');
    const rejected = await fetch(`${baseUrl}/api/users/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: badForm,
    });
    expect(rejected.status).toBe(400);

    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('fixture-avatar-bytes'),
    ]);
    const form = new FormData();
    form.append('file', new Blob([png], { type: 'image/png' }), 'avatar.png');
    const uploaded = await fetch(`${baseUrl}/api/users/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    expect(uploaded.status).toBe(201);
    expect(await uploaded.json()).toEqual({ hasAvatar: true });

    const identity = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
    expect(await identity.json()).toMatchObject({ hasAvatar: true });

    const served = await fetch(`${baseUrl}/api/users/me/avatar`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(served.status).toBe(200);
    expect(served.headers.get('Content-Type')).toBe('image/png');
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(new Uint8Array(png));

    const removed = await fetch(`${baseUrl}/api/users/me/avatar`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(removed.status).toBe(204);

    const afterRemoval = await fetch(`${baseUrl}/api/users/me/avatar`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(afterRemoval.status).toBe(404);
  });

  test('refuses to serve the avatar of a user outside the visible leader directory', async () => {
    const entity = await prisma.entity.create({ data: { name: `Avatar Entity ${crypto.randomUUID()}` } });
    const group = await prisma.group.create({ data: { name: 'Avatar Group', entityId: entity.id } });
    const responsibleEmail = `responsible-${crypto.randomUUID()}@fivondronana.test`;
    const responsible = await prisma.user.create({
      data: {
        accountName: 'Avatar Responsible',
        email: responsibleEmail,
        emailNormalized: responsibleEmail,
        passwordHash: await hashPassword('integration-password'),
        roles: { create: [{ role: 'RESPONSIBLE' }] },
        membership: { create: { entityId: entity.id, groupId: group.id } },
      },
    });
    try {
      const login = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: responsibleEmail, password: 'integration-password' }),
      });
      const { accessToken: responsibleToken } = (await login.json()) as { accessToken: string };

      const response = await fetch(`${baseUrl}/api/leaders/${userId}/avatar`, {
        headers: { Authorization: `Bearer ${responsibleToken}` },
      });
      expect(response.status).toBe(404);
    } finally {
      await prisma.user.delete({ where: { id: responsible.id } });
      await prisma.group.delete({ where: { id: group.id } });
      await prisma.entity.delete({ where: { id: entity.id } });
    }
  });
});

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
