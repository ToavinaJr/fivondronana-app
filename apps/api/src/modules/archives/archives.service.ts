import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';
import { FILE_STORAGE, VIRUS_SCANNER, type FileStorage, type VirusScanner } from './file-storage.js';
import type { CreateArchiveDto } from './dto/create-archive.dto.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const TYPES = {
  '.pdf': { mime: 'application/pdf', signature: (b: Buffer) => b.subarray(0, 5).toString() === '%PDF-' },
  '.doc': {
    mime: 'application/msword',
    signature: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
  },
  '.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    signature: (b: Buffer) => b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
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
      if (!file) throw new ServiceUnavailableException('Tsy hita ny rakitra voatahiry.');
      await this.scanner.scan(file.data);
    }
    return this.prisma.archive.update({
      where: { id },
      data: { isPublished },
      select: { id: true, isPublished: true },
    });
  }

  async getDownload(id: string) {
    const archive = await this.prisma.archive.findFirst({ where: { id, isPublished: true } });
    if (!archive) throw new NotFoundException('Tsy hita ny tahiry.');
    const file = await this.storage.get(archive.storageKey);
    if (!file || file.size !== archive.size || file.sha256 !== archive.sha256)
      throw new ServiceUnavailableException('Tsy azo vakina na tsy mifanaraka ny rakitra voatahiry.');
    return { archive, data: file.data };
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
