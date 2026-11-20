import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL_TEST;
const databaseUrl = connectionString ? new URL(connectionString) : null;
if (databaseUrl && !databaseUrl.pathname.toLowerCase().includes('_test')) {
  throw new Error('DATABASE_URL_TEST must point to a database whose name includes _test.');
}

describe.skipIf(!connectionString)('PostgreSQL integration', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    if (!connectionString) throw new Error('DATABASE_URL_TEST must be set.');
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('persists a user and related session using the migrated schema', async () => {
    const email = `integration-${randomUUID()}@fivondronana.test`;
    const user = await prisma.user.create({
      data: {
        accountName: 'Integration test',
        email,
        emailNormalized: email,
        phone: null,
        phoneNormalized: null,
        passwordHash: 'test-only-hash',
      },
    });

    try {
      const session = await prisma.authSession.create({
        data: { id: randomUUID(), userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
        include: { user: true },
      });
      expect(session.user.id).toBe(user.id);
      expect(session.user.emailNormalized).toBe(email);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
