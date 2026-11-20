import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateArchiveDto } from './dto/create-archive.dto.js';
import { FILE_STORAGE, type FileStorage, VIRUS_SCANNER, type VirusScanner } from './file-storage.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
function isDocx(buffer: Buffer): boolean {
  if (!buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) return false;
  const searchStart = Math.max(0, buffer.length - 65_557);
  let endRecord = -1;
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      endRecord = offset;
      break;
    }
  }
  if (endRecord < 0) return false;
  const entryCount = buffer.readUInt16LE(endRecord + 10);
  let cursor = buffer.readUInt32LE(endRecord + 16);
  const entries = new Set<string>();
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) return false;
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    if (cursor + 46 + nameLength + extraLength + commentLength > buffer.length) return false;
    entries.add(buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8'));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries.has('[Content_Types].xml') && entries.has('word/document.xml');
}

const TYPES = {
  '.pdf': { mime: 'application/pdf', signature: (b: Buffer) => b.subarray(0, 5).toString() === '%PDF-' },
  '.doc': {
    mime: 'application/msword',
    signature: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
  },
  '.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    signature: isDocx,
  },
} as const;

@Injectable()
export class ArchivesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    @Inject(VIRUS_SCANNER) private readonly scanner: VirusScanner,
  ) {}

  async list() {
    return this.prisma.archive.findMany({
      where: { isPublished: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        year: true,
        fileName: true,
        contentType: true,
        size: true,
        createdAt: true,
      },
    });
  }

  async upload(input: CreateArchiveDto, file?: { buffer?: Buffer; originalname?: string; size?: number }) {
    if (!file?.buffer?.byteLength || !file.originalname)
      throw new BadRequestException('Tsy maintsy ampidirina ny rakitra.');
    if (file.buffer.byteLength > MAX_FILE_SIZE)
      throw new BadRequestException('Ny rakitra dia tsy tokony hihoatra ny 5 Mo.');
    const originalName = file.originalname
      .replaceAll('\\', '/')
      .split('/')
      .at(-1)
      ?.replace(/[\u0000-\u001f\u007f]/g, '')
      .trim();
    if (!originalName || originalName.length > 180) throw new BadRequestException('Tsy mety ny anaran’ny rakitra.');
    const extension = originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
    const type = TYPES[extension as keyof typeof TYPES];
    if (!type || !type.signature(file.buffer))
      throw new BadRequestException('PDF na Word tena izy ihany no azo ampidirina.');

    await this.scanner.scan(file.buffer);
    const storageKey = randomUUID();
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    await this.storage.put(storageKey, { data: file.buffer, size: file.buffer.byteLength, sha256 });
    try {
      return await this.prisma.archive.create({
        data: {
          title: input.title.trim(),
          description: input.description?.trim() ?? '',
          category: input.category.trim(),
          year: input.year,
          fileName: originalName,
          contentType: type.mime,
          size: file.buffer.byteLength,
          sha256,
          storageKey,
        },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          year: true,
          fileName: true,
          contentType: true,
          size: true,
          isPublished: true,
          createdAt: true,
        },
      });
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async setPublished(id: string, isPublished: boolean) {
    const archive = await this.prisma.archive.findUnique({ where: { id }, select: { id: true, storageKey: true } });
    if (!archive) throw new NotFoundException('Tsy hita ny tahiry.');
    if (isPublished) {
      const file = await this.storage.get(archive.storageKey);
      if (!file || createHash('sha256').update(file.data).digest('hex') !== file.sha256)
        throw new ServiceUnavailableException('Tsy hita na simba ny rakitra voatahiry.');
      await this.scanner.scan(file.data);
    }
    return this.prisma.archive.update({
      where: { id },
      data: { isPublished },
      select: { id: true, isPublished: true },
    });
  }

  async getDownload(id: string) {
    return this.readArchiveBytes(await this.prisma.archive.findFirst({ where: { id, isPublished: true } }));
  }

  async getDownloadForAdmin(id: string) {
    return this.readArchiveBytes(await this.prisma.archive.findUnique({ where: { id } }));
  }

  private async readArchiveBytes(archive: Awaited<ReturnType<PrismaService['archive']['findUnique']>>) {
    if (!archive) throw new NotFoundException('Tsy hita ny tahiry.');
    const file = await this.storage.get(archive.storageKey);
    if (
      !file ||
      file.size !== archive.size ||
      file.sha256 !== archive.sha256 ||
      createHash('sha256').update(file.data).digest('hex') !== archive.sha256
    )
      throw new ServiceUnavailableException('Tsy azo vakina na tsy mifanaraka ny rakitra voatahiry.');
    return { archive, data: file.data };
  }

  listForAdministration() {
    return this.prisma.archive.findMany({
      orderBy: [{ isPublished: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        year: true,
        fileName: true,
        contentType: true,
        size: true,
        sha256: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string): Promise<void> {
    const archive = await this.prisma.archive.findUnique({ where: { id }, select: { id: true, storageKey: true } });
    if (!archive) throw new NotFoundException('Tsy hita ny tahiry.');
    await this.prisma.$transaction(async (transaction) => {
      await transaction.archive.delete({ where: { id } });
      await transaction.fileObject.delete({ where: { storageKey: archive.storageKey } });
    });
  }
}
