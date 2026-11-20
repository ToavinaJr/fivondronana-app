import 'reflect-metadata';
import { describe, expect, it, mock } from 'bun:test';
import { createHash } from 'node:crypto';
import { AvatarService } from '../../src/modules/users/avatar.service.js';

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('fixture-bytes'),
]);

describe('avatar service', () => {
  it('scans, stores, and replaces a previous avatar for the same user', async () => {
    const scanner = { scan: mock(async () => {}) };
    const storage = { put: mock(async () => {}), get: mock(async () => null), delete: mock(async () => {}) };
    const prisma = {
      user: {
        findUnique: mock(async (_args: { where: { id: string } }) => ({ avatarKey: 'old-key' })),
        update: mock(async () => ({})),
      },
    };
    const service = new AvatarService(prisma as never, storage as never, scanner as never);

    const result = await service.upload('user-1', { buffer: png, originalname: 'photo.png', size: png.byteLength });

    expect(result).toEqual({ hasAvatar: true });
    expect(scanner.scan).toHaveBeenCalledTimes(1);
    expect(storage.put).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenCalledWith('old-key');
  });

  it('rejects a file that is not a real JPEG or PNG', async () => {
    const scanner = { scan: mock(async () => {}) };
    const storage = { put: mock(async () => {}), get: mock(async () => null), delete: mock(async () => {}) };
    const service = new AvatarService({} as never, storage as never, scanner as never);

    await expect(
      service.upload('user-1', { buffer: Buffer.from('not an image'), originalname: 'fake.png', size: 12 }),
    ).rejects.toThrow();
    expect(scanner.scan).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('removes the stored file and clears avatarKey', async () => {
    const storage = { put: mock(async () => {}), get: mock(async () => null), delete: mock(async () => {}) };
    const prisma = {
      user: {
        findUnique: mock(async () => ({ avatarKey: 'current-key' })),
        update: mock(async () => ({})),
      },
    };
    const service = new AvatarService(prisma as never, storage as never, { scan: mock(async () => {}) } as never);

    await service.remove('user-1');

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { avatarKey: null } });
    expect(storage.delete).toHaveBeenCalledWith('current-key');
  });

  it('serves verified avatar bytes and rejects a corrupted file', async () => {
    const sha256 = createHash('sha256').update(png).digest('hex');
    const prisma = { user: { findUnique: mock(async () => ({ avatarKey: 'key-1' })) } };
    const storage = {
      put: mock(async () => {}),
      get: mock(async () => ({ data: png, size: png.byteLength, sha256 })),
      delete: mock(async () => {}),
    };
    const service = new AvatarService(prisma as never, storage as never, { scan: mock(async () => {}) } as never);

    const served = await service.getAvatar('user-1');
    expect(served).toEqual({ data: png, contentType: 'image/png' });

    storage.get = mock(async () => ({ data: png, size: png.byteLength, sha256: 'wrong' }));
    await expect(service.getAvatar('user-1')).rejects.toThrow();
  });

  it('reports no avatar for a user who never uploaded one', async () => {
    const prisma = { user: { findUnique: mock(async () => ({ avatarKey: null })) } };
    const service = new AvatarService(
      prisma as never,
      { put: mock(async () => {}), get: mock(async () => null), delete: mock(async () => {}) } as never,
      { scan: mock(async () => {}) } as never,
    );

    await expect(service.getAvatar('user-1')).rejects.toThrow('Tsy mbola misy sary.');
  });
});
