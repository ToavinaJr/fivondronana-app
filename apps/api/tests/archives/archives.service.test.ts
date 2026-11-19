import 'reflect-metadata';
import { describe, expect, it, mock } from 'bun:test';
import { ArchivesService } from '../../src/modules/archives/archives.service.js';

const pdf = Buffer.from('%PDF-1.7\nfixture');
const input = { title: 'Fitsipika', category: 'fitsipika', year: 2026 };

describe('Arisiva file handling', () => {
  it('scans and stores an allowed file as an unpublished archive without returning its storage key', async () => {
    const scanner = { scan: mock(async () => {}) };
    const storage = { put: mock(async () => {}), get: mock(async () => null), delete: mock(async () => {}) };
    const prisma = {
      archive: { create: mock(async () => ({ id: 'archive-1', title: input.title, isPublished: false })) },
    };
    const service = new ArchivesService(prisma as never, storage as never, scanner as never);
    const result = await service.upload(input, { buffer: pdf, originalname: 'reglement.pdf', size: pdf.byteLength });
    expect(scanner.scan).toHaveBeenCalledTimes(1);
    expect(storage.put).toHaveBeenCalledTimes(1);
    expect(prisma.archive.create.mock.calls[0]?.[0].data.isPublished).toBeUndefined();
    expect(result).not.toHaveProperty('storageKey');
    expect(result).not.toHaveProperty('data');
  });

  it('never persists a file when the antivirus scan fails', async () => {
    const scanner = {
      scan: mock(async () => {
        throw new Error('infected');
      }),
    };
    const storage = { put: mock(async () => {}), get: mock(async () => null), delete: mock(async () => {}) };
    const prisma = { archive: { create: mock(async () => ({})) } };
    const service = new ArchivesService(prisma as never, storage as never, scanner as never);
    await expect(service.upload(input, { buffer: pdf, originalname: 'reglement.pdf' })).rejects.toThrow('infected');
    expect(storage.put).not.toHaveBeenCalled();
    expect(prisma.archive.create).not.toHaveBeenCalled();
  });

  it('rejects misleading extensions and signatures', async () => {
    const scanner = { scan: mock(async () => {}) };
    const storage = { put: mock(async () => {}), get: mock(async () => null), delete: mock(async () => {}) };
    const service = new ArchivesService({} as never, storage as never, scanner as never);
    await expect(service.upload(input, { buffer: pdf, originalname: 'script.exe' })).rejects.toThrow();
    await expect(
      service.upload(input, { buffer: Buffer.from('not a PDF'), originalname: 'fake.pdf' }),
    ).rejects.toThrow();
    await expect(
      service.upload(input, { buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04]), originalname: 'fake.docx' }),
    ).rejects.toThrow();
    await expect(
      service.upload(input, { buffer: Buffer.alloc(5 * 1024 * 1024 + 1), originalname: 'large.pdf' }),
    ).rejects.toThrow();
    expect(scanner.scan).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });
});
