import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { CvAccessService } from '../../src/modules/cvs/cv-access.service.js';

const connectionString = process.env.DATABASE_URL_TEST;
const databaseUrl = connectionString ? new URL(connectionString) : null;
if (databaseUrl && !databaseUrl.pathname.toLowerCase().endsWith('_test')) {
  throw new Error('DATABASE_URL_TEST must point to a disposable database whose name ends with _test.');
}

describe.skipIf(!connectionString)('responsible CV PostgreSQL integration', () => {
  let prisma: PrismaClient;
  const suffix = randomUUID();
  const userIds: string[] = [];
  const entityIds: string[] = [];
  const groupIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString as string }) });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
    await prisma.entity.deleteMany({ where: { id: { in: entityIds } } });
    await prisma.$disconnect();
  });

  it('lets a responsible read any active responsible CV, excludes inactive or ordinary accounts, and paginates exports', async () => {
    const entity = await prisma.entity.create({ data: { name: `CV Entity ${suffix}` } });
    entityIds.push(entity.id);
    const group = await prisma.group.create({ data: { name: `CV Group ${suffix}`, entityId: entity.id } });
    groupIds.push(group.id);
    const createResponsible = (accountName: string, isActive = true, role = 'RESPONSIBLE' as const) =>
      prisma.user.create({
        data: {
          accountName: `${accountName} ${suffix}`,
          passwordHash: 'integration-only-secret',
          isActive,
          roles: { create: [{ role }] },
          membership: { create: { entityId: entity.id, groupId: group.id } },
          cv: {
            create: {
              firstName: accountName,
              lastName: 'Test',
              address: 'Test address',
              birthDate: new Date('1990-01-01T00:00:00.000Z'),
              phone: '0340000000',
              email: `${accountName.toLowerCase()}-${suffix}@example.test`,
              province: 'Analamanga',
              area: 'Test area',
              fivondronana: 'Test fivondronana',
            },
          },
        },
      });

    const owner = await createResponsible('Owner');
    const second = await createResponsible('Second');
    const disabled = await createResponsible('Disabled', false);
    const ordinary = await prisma.user.create({
      data: {
        accountName: `Ordinary ${suffix}`,
        passwordHash: 'integration-only-secret',
        cv: {
          create: {
            firstName: 'Ordinary',
            lastName: 'Test',
            address: 'Test address',
            birthDate: new Date('1990-01-01T00:00:00.000Z'),
            phone: '0340000001',
            email: `ordinary-${suffix}@example.test`,
            province: 'Analamanga',
            area: 'Test area',
            fivondronana: 'Test fivondronana',
          },
        },
      },
    });
    userIds.push(owner.id, second.id, disabled.id, ordinary.id);

    const service = new CvAccessService(prisma as never);
    const crossEntityCv = await service.getByUserId(second.id);
    expect(crossEntityCv).toMatchObject({ firstName: 'Second', template: null });
    expect(crossEntityCv).not.toHaveProperty('userId');
    expect(crossEntityCv).not.toHaveProperty('passwordHash');
    expect(await service.getByUserId(disabled.id)).toBeNull();
    expect(await service.getByUserId(ordinary.id)).toBeNull();

    const all = await service.listResponsibleCvs({ page: 1, pageSize: 1 });
    expect(all.pagination.total).toBe(2);
    expect(all.data).toHaveLength(1);
    expect(all.data[0]).not.toHaveProperty('userId');
    expect(all.data[0]).not.toHaveProperty('passwordHash');
  });
});
