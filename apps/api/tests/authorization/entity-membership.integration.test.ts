import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL_TEST;
const databaseUrl = connectionString ? new URL(connectionString) : null;
if (databaseUrl && !databaseUrl.pathname.toLowerCase().endsWith('_test')) {
  throw new Error('DATABASE_URL_TEST must point to a disposable database whose name ends with _test.');
}

describe.skipIf(!connectionString)('entity membership constraints', () => {
  let prisma: PrismaClient;
  const suffix = randomUUID();
  const users: string[] = [];
  const entities: string[] = [];
  const groups: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString as string }) });
    await prisma.$connect();
  });

  afterAll(async () => {
    if (users.length) await prisma.user.deleteMany({ where: { id: { in: users } } });
    if (groups.length) await prisma.group.deleteMany({ where: { id: { in: groups } } });
    if (entities.length) await prisma.entity.deleteMany({ where: { id: { in: entities } } });
    await prisma.$disconnect();
  });

  it('enforces exactly one group/entity pair per user and rejects mismatched pairs', async () => {
    const entityA = await prisma.entity.create({ data: { name: `Entity A ${suffix}` } });
    const entityB = await prisma.entity.create({ data: { name: `Entity B ${suffix}` } });
    entities.push(entityA.id, entityB.id);
    const groupA = await prisma.group.create({ data: { name: `Group A ${suffix}`, entityId: entityA.id } });
    const groupB = await prisma.group.create({ data: { name: `Group B ${suffix}`, entityId: entityB.id } });
    groups.push(groupA.id, groupB.id);
    const user = await prisma.user.create({
      data: {
        accountName: `Membership ${suffix}`,
        passwordHash: 'test-only-hash',
        roles: { create: [{ role: 'RESPONSIBLE' }] },
      },
    });
    users.push(user.id);

    await expect(
      Promise.resolve(
        prisma.entityMembership.create({ data: { userId: user.id, entityId: entityA.id, groupId: groupB.id } }),
      ),
    ).rejects.toThrow();
    const outcomes = await Promise.allSettled([
      prisma.entityMembership.create({ data: { userId: user.id, entityId: entityA.id, groupId: groupA.id } }),
      prisma.entityMembership.create({ data: { userId: user.id, entityId: entityB.id, groupId: groupB.id } }),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.entityMembership.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.userRole.count({ where: { userId: user.id } })).toBe(1);
  });

  it('allows administrator and responsible roles to coexist on one user', async () => {
    const user = await prisma.user.create({
      data: {
        accountName: `Dual role ${suffix}`,
        passwordHash: 'test-only-hash',
        roles: { create: [{ role: 'ADMINISTRATOR' }, { role: 'RESPONSIBLE' }] },
      },
    });
    users.push(user.id);
    expect(await prisma.userRole.count({ where: { userId: user.id } })).toBe(2);
  });
});
