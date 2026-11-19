import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { FileStorage, StoredFile } from './file-storage.js';

@Injectable()
export class PostgresFileStorage implements FileStorage {
  constructor(private readonly prisma: PrismaService) {}

  async put(key: string, file: StoredFile): Promise<void> {
    await this.prisma.fileObject.create({ data: { storageKey: key, ...file, data: Buffer.from(file.data) } });
  }

  async get(key: string): Promise<StoredFile | null> {
    const file = await this.prisma.fileObject.findUnique({ where: { storageKey: key } });
    return file ? { data: file.data, size: file.size, sha256: file.sha256 } : null;
  }

  async delete(key: string): Promise<void> {
    await this.prisma.fileObject.delete({ where: { storageKey: key } });
  }
}
