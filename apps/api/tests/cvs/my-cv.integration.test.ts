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

describe.skipIf(!testDatabaseUrl)('self-service CV over HTTP', () => {
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
    process.env.JWT_SECRET = 'my-cv-integration-test-secret-that-is-not-used-outside-tests';

    app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
    configureApiApp(app);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    prisma = app.get(PrismaService);

    const email = `my-cv-${crypto.randomUUID()}@fivondronana.test`;
    const user = await prisma.user.create({
      data: {
        accountName: 'My Cv Integration',
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

  test('round-trips a saved CV through GET then PUT, as the mobile client does, without leaking internal fields', async () => {
    const cv = {
      firstName: 'Tiana',
      lastName: 'Rabe',
      address: 'Antananarivo',
      birthDate: '1990-01-01',
      birthPlace: null,
      phone: '0341234567',
      email: 'tiana@example.org',
      facebook: null,
      province: 'Analamanga',
      area: 'Avaradrano',
      fivondronana: 'Antananarivo',
      extraPersonal: [{ label: 'Andraikitra', value: 'Mpiandraikitra' }],
      extraContact: [],
      branches: [{ name: 'Mpanazava', group: 'Maitso', project: '', startedAt: '', endedAt: '' }],
      activities: [],
    };

    const created = await fetch(`${baseUrl}/api/cvs/me`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cv),
    });
    expect(created.status).toBe(200);
    const createdBody = await created.json();
    for (const field of ['id', 'userId', 'createdAt', 'updatedAt']) expect(createdBody).not.toHaveProperty(field);
    expect(createdBody.branches[0]).not.toHaveProperty('id');
    expect(createdBody.branches[0]).not.toHaveProperty('cvId');

    const fetched = await fetch(`${baseUrl}/api/cvs/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
    expect(fetched.status).toBe(200);
    const fetchedBody = await fetched.json();
    for (const field of ['id', 'userId', 'createdAt', 'updatedAt']) expect(fetchedBody).not.toHaveProperty(field);
    expect(fetchedBody.branches[0]).not.toHaveProperty('id');
    expect(fetchedBody.branches[0]).not.toHaveProperty('cvId');

    // The mobile client re-sends exactly what it loaded when the user edits and saves again.
    const resaved = await fetch(`${baseUrl}/api/cvs/me`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fetchedBody),
    });
    expect(resaved.status).toBe(200);
  });
});

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
