import { describe, expect, it, mock } from 'bun:test';
import { BadRequestException } from '@nestjs/common';
import { EntitiesService } from '../../src/modules/entities/entities.service.js';

describe('entity assignment service', () => {
  it('rejects a group that belongs to a different entity before writing', async () => {
    const prisma = {
      user: { findUnique: mock(async () => ({ isActive: true })) },
      group: { findUnique: mock(async () => ({ entityId: 'entity-a', isActive: true, entity: { isActive: true } })) },
      $transaction: mock(async () => undefined),
    };
    await expect(
      new EntitiesService(prisma as never).assignResponsible('user-1', 'entity-b', 'group-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('writes the one membership and responsible role atomically', async () => {
    const tx = {
      entityMembership: { upsert: mock(async () => ({})) },
      userRole: { upsert: mock(async () => ({})) },
    };
    const prisma = {
      user: { findUnique: mock(async () => ({ isActive: true })) },
      group: { findUnique: mock(async () => ({ entityId: 'entity-a', isActive: true, entity: { isActive: true } })) },
      $transaction: mock(async (operation: (transaction: typeof tx) => Promise<void>) => operation(tx)),
    };
    await new EntitiesService(prisma as never).assignResponsible('user-1', 'entity-a', 'group-1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.entityMembership.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', entityId: 'entity-a', groupId: 'group-1' },
      update: { entityId: 'entity-a', groupId: 'group-1' },
    });
    expect(tx.userRole.upsert).toHaveBeenCalled();
  });
});
