import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { ArchivesService } from '../../src/modules/archives/archives.service.js';
import { PostgresFileStorage } from '../../src/modules/archives/postgres-file-storage.js';

const connectionString = process.env.DATABASE_URL_TEST;
const databaseUrl = connectionString ? new URL(connectionString) : null;
if (databaseUrl && !databaseUrl.pathname.toLowerCase().endsWith('_test')) {
  throw new Error('DATABASE_URL_TEST must point to a disposable database whose name ends with _test.');
}

describe.skipIf(!connectionString)('Arisiva PostgreSQL file storage', () => {
  let prisma: PrismaClient;
  const archiveIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString as string }) });
    await prisma.$connect();
  });

  afterAll(async () => {
    if (archiveIds.length) {
      const archives = await prisma.archive.findMany({
        where: { id: { in: archiveIds } },
        select: { storageKey: true },
      });
      await prisma.archive.deleteMany({ where: { id: { in: archiveIds } } });
      if (archives.length)
        await prisma.fileObject.deleteMany({
          where: { storageKey: { in: archives.map(({ storageKey }) => storageKey) } },
        });
    }
    await prisma.$disconnect();
  });

  it('persists bytes, publishes only after scanning, serves verified bytes, and deletes both records', async () => {
    const storage = new PostgresFileStorage(prisma as never);
    const scanner = { scan: mock(async () => {}) };
    const service = new ArchivesService(prisma as never, storage, scanner);
    const data = Buffer.from('%PDF-1.7 Arisiva integration fixture');
    const created = await service.upload(
      { title: `Integration ${randomUUID()}`, category: 'test', year: 2026 },
      { buffer: data, originalname: 'fixture.pdf' },
    );
    archiveIds.push(created.id);
    const storedBeforePublish = await prisma.fileObject.findUnique({
      where: { storageKey: (await prisma.archive.findUniqueOrThrow({ where: { id: created.id } })).storageKey },
    });
    expect(storedBeforePublish?.data).toEqual(data);
    expect((await prisma.archive.findUnique({ where: { id: created.id } }))?.isPublished).toBe(false);

    await service.setPublished(created.id, true);
    expect(scanner.scan).toHaveBeenCalledTimes(2);
    const served = await service.getDownload(created.id);
    expect(served.data).toEqual(data);
    expect((await service.list()).some(({ id }) => id === created.id)).toBe(true);

    await service.remove(created.id);
    archiveIds.splice(archiveIds.indexOf(created.id), 1);
    expect(await prisma.archive.findUnique({ where: { id: created.id } })).toBeNull();
    expect(await prisma.fileObject.count({ where: { storageKey: served.archive.storageKey } })).toBe(0);
  });
});
