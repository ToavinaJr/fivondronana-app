import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { ContactsService } from '../../src/modules/contacts/contacts.service.js';

const connectionString = process.env.DATABASE_URL_TEST;
const databaseUrl = connectionString ? new URL(connectionString) : null;
if (databaseUrl && !databaseUrl.pathname.toLowerCase().endsWith('_test')) {
  throw new Error('DATABASE_URL_TEST must point to a disposable database whose name ends with _test.');
}

describe.skipIf(!connectionString)('contacts PostgreSQL integration', () => {
  let prisma: PrismaClient;
  const suffix = randomUUID();
  const contactIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString as string }) });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.contact.deleteMany({ where: { id: { in: contactIds } } });
    await prisma.$disconnect();
  });

  it('excludes drafts, searches published contacts, and enforces the publish/update/delete boundary', async () => {
    const published = await prisma.contact.create({
      data: {
        name: `Filoha ${suffix}`,
        responsibility: 'Mpitantam-bola',
        groupLabel: 'Tily foibe',
        address: 'Antananarivo',
        phone: '+261 34 00 000 00',
        email: `filoha-${suffix}@example.test`,
        description: 'Description',
        kind: 'INTERNAL',
        isPublished: true,
      },
    });
    const draft = await prisma.contact.create({
      data: {
        name: `Draft ${suffix}`,
        responsibility: 'Mpiara-miasa',
        groupLabel: 'Fiaraha-miasa',
        address: 'Toamasina',
        phone: '+261 34 00 000 01',
        email: `draft-${suffix}@example.test`,
        description: 'Description',
        kind: 'EXTERNAL',
        isPublished: false,
      },
    });
    contactIds.push(published.id, draft.id);

    const service = new ContactsService(prisma as never);
    const all = await service.list({ page: 1, pageSize: 20, q: suffix });
    expect(all.data.map(({ id }) => id)).toEqual([published.id]);

    const updated = await service.update(published.id, { address: 'Toliara' });
    expect(updated.address).toBe('Toliara');

    const unpublished = await service.setPublished(published.id, false);
    expect(unpublished.isPublished).toBe(false);
    expect((await service.list({ page: 1, pageSize: 20, q: suffix })).data).toEqual([]);

    await service.remove(draft.id);
    contactIds.splice(contactIds.indexOf(draft.id), 1);
    await expect(prisma.contact.findUnique({ where: { id: draft.id } })).resolves.toBeNull();
  });
});
