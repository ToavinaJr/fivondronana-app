import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { LeaderService } from '../../src/modules/users/leader.service.js';

const connectionString = process.env.DATABASE_URL_TEST;
const databaseUrl = connectionString ? new URL(connectionString) : null;
if (databaseUrl && !databaseUrl.pathname.toLowerCase().endsWith('_test')) {
  throw new Error('DATABASE_URL_TEST must point to a disposable database whose name ends with _test.');
}

describe.skipIf(!connectionString)('responsible directory PostgreSQL integration', () => {
  let prisma: PrismaClient;
  const suffix = randomUUID();
  const userIds: string[] = [];
  const groupIds: string[] = [];
  const entityIds: string[] = [];
  const responsibilityIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString as string }) });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
    await prisma.entity.deleteMany({ where: { id: { in: entityIds } } });
    await prisma.officialResponsibility.deleteMany({ where: { id: { in: responsibilityIds } } });
    await prisma.$disconnect();
  });

  it('lists active responsible users across entities, filters deterministically, and projects no account internals', async () => {
    const entityA = await prisma.entity.create({ data: { name: `Directory A ${suffix}` } });
    const entityB = await prisma.entity.create({ data: { name: `Directory B ${suffix}` } });
    entityIds.push(entityA.id, entityB.id);
    const groupA = await prisma.group.create({ data: { name: 'Tily', entityId: entityA.id } });
    const groupB = await prisma.group.create({ data: { name: 'Mpanazava', entityId: entityB.id } });
    groupIds.push(groupA.id, groupB.id);
    const responsibility = await prisma.officialResponsibility.create({ data: { name: `Responsibility ${suffix}` } });
    responsibilityIds.push(responsibility.id);

    const tiana = await prisma.user.create({
      data: {
        accountName: `A Tiana ${suffix}`,
        passwordHash: 'integration-only-secret',
        email: `tiana-${suffix}@example.test`,
        roles: { create: [{ role: 'RESPONSIBLE' }] },
        membership: { create: { entityId: entityA.id, groupId: groupA.id } },
        responsibilities: { create: [{ responsibilityId: responsibility.id }] },
      },
    });
    const bakoly = await prisma.user.create({
      data: {
        accountName: `B Bakoly ${suffix}`,
        passwordHash: 'integration-only-secret',
        roles: { create: [{ role: 'RESPONSIBLE' }] },
        membership: { create: { entityId: entityB.id, groupId: groupB.id } },
      },
    });
    const ordinary = await prisma.user.create({
      data: { accountName: `Ordinary ${suffix}`, passwordHash: 'integration-only-secret' },
    });
    userIds.push(tiana.id, bakoly.id, ordinary.id);

    const service = new LeaderService(prisma as never);
    const all = await service.list({ page: 1, pageSize: 20 });
    expect(all.data.map(({ accountName }) => accountName)).toEqual([tiana.accountName, bakoly.accountName]);
    expect(all.data[0]).toMatchObject({
      entity: { id: entityA.id },
      group: { id: groupA.id },
      responsibilities: [responsibility.name],
    });
    expect(all.data[0]).not.toHaveProperty('email');
    expect(all.data[0]).not.toHaveProperty('passwordHash');
    expect(all.data[0]).not.toHaveProperty('userId');

    const filtered = await service.list({ page: 1, pageSize: 20, entityId: entityB.id, q: '  bakoly  ' });
    expect(filtered.data.map(({ id }) => id)).toEqual([bakoly.id]);
    expect(filtered.pagination.total).toBe(1);

    await prisma.user.update({ where: { id: bakoly.id }, data: { isActive: false } });
    const afterDeactivation = await service.list({ page: 1, pageSize: 20 });
    expect(afterDeactivation.data.map(({ id }) => id)).toEqual([tiana.id]);
  });
});
