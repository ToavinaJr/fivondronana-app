import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FILE_STORAGE, type FileStorage, VIRUS_SCANNER, type VirusScanner } from '../archives/file-storage.js';
import { PrismaService } from '../database/prisma.service.js';

export const MAX_AVATAR_SIZE = 3 * 1024 * 1024;

const AVATAR_TYPES = {
  '.jpg': { mime: 'image/jpeg', signature: (b: Buffer) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
  '.jpeg': { mime: 'image/jpeg', signature: (b: Buffer) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
  '.png': {
    mime: 'image/png',
    signature: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
} as const;

type UploadedAvatar = { buffer: Buffer; originalname: string; size: number };

@Injectable()
export class AvatarService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    @Inject(VIRUS_SCANNER) private readonly scanner: VirusScanner,
  ) {}

  async upload(userId: string, file?: UploadedAvatar): Promise<{ hasAvatar: true }> {
    if (!file?.buffer?.byteLength || !file.originalname)
      throw new BadRequestException('Tsy maintsy ampidirina ny sary.');
    if (file.buffer.byteLength > MAX_AVATAR_SIZE)
      throw new BadRequestException('Ny sary dia tsy tokony hihoatra ny 3 Mo.');
    const originalName = file.originalname.replaceAll('\\', '/').split('/').at(-1)?.trim();
    const extension = originalName?.slice(originalName.lastIndexOf('.')).toLowerCase();
    const type = extension ? AVATAR_TYPES[extension as keyof typeof AVATAR_TYPES] : undefined;
    if (!type || !type.signature(file.buffer))
      throw new BadRequestException('Sary JPEG na PNG ihany no azo ampiasaina.');

    await this.scanner.scan(file.buffer);
    const storageKey = randomUUID();
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    await this.storage.put(storageKey, { data: file.buffer, size: file.buffer.byteLength, sha256 });

    try {
      const previous = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarKey: true } });
      if (!previous) throw new NotFoundException('Mpikambana tsy hita.');
      await this.prisma.user.update({ where: { id: userId }, data: { avatarKey: storageKey } });
      if (previous.avatarKey) await this.storage.delete(previous.avatarKey).catch(() => undefined);
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
    return { hasAvatar: true };
  }

  async remove(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarKey: true } });
    if (!user?.avatarKey) return;
    await this.prisma.user.update({ where: { id: userId }, data: { avatarKey: null } });
    await this.storage.delete(user.avatarKey).catch(() => undefined);
  }

  async getAvatar(userId: string): Promise<{ data: Uint8Array; contentType: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarKey: true } });
    if (!user?.avatarKey) throw new NotFoundException('Tsy mbola misy sary.');
    const file = await this.storage.get(user.avatarKey);
    if (!file || createHash('sha256').update(file.data).digest('hex') !== file.sha256)
      throw new ServiceUnavailableException('Tsy azo vakina ny sary voatahiry.');
    const contentType = file.data[0] === 0x89 ? 'image/png' : 'image/jpeg';
    return { data: file.data, contentType };
  }
}
