import { describe, expect, it, mock } from 'bun:test';
import { ConflictException } from '@nestjs/common';
import { ResponsibilitiesService } from '../../src/modules/administration/responsibilities.service.js';

describe('official responsibilities administration', () => {
  it('publishes the approved initial catalogue', () => {
    expect(ResponsibilitiesService.initialCatalogue).toEqual([
      'Haim-panahy',
      'Fampitaovana',
      'Mpitantsoratra',
      'Mpitahiry vola',
    ]);
  });

  it('refuses to remove a responsibility that still has assignments', async () => {
    const prisma = {
      officialResponsibility: {
        findUnique: mock(async () => ({ id: 'resp-1', _count: { assignments: 1 } })),
        delete: mock(async () => ({})),
      },
    };
    await expect(new ResponsibilitiesService(prisma as never).remove('resp-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.officialResponsibility.delete).not.toHaveBeenCalled();
  });

  it('normalizes names before creating catalogue entries', async () => {
    const create = mock(async ({ data }: { data: { name: string } }) => data);
    const prisma = { officialResponsibility: { create } };
    expect(await new ResponsibilitiesService(prisma as never).create('  Mpitarika  ')).toEqual({ name: 'Mpitarika' });
  });
});
