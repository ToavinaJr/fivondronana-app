import { describe, expect, it, mock } from 'bun:test';
import { ConflictException, NotFoundException } from '@nestjs/common';
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

  it('lists every responsibility, active or not, so administrators can manage and assign them all', async () => {
    const findMany = mock(async (_args: { orderBy: unknown }) => [
      { id: 'a', name: 'Haim-panahy', isActive: true },
      { id: 'b', name: 'Retraite', isActive: false },
    ]);
    const prisma = { officialResponsibility: { findMany } };
    const result = await new ResponsibilitiesService(prisma as never).list();
    expect(result).toHaveLength(2);
    expect(findMany.mock.calls[0]?.[0]).toEqual({ orderBy: { name: 'asc' } });
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
    expect(await new ResponsibilitiesService(prisma as never).create('  Mpitarika  ')).toMatchObject({
      name: 'Mpitarika',
    });
  });

  it('renames a responsibility after trimming the new name', async () => {
    const update = mock(async ({ data }: { data: { name: string } }) => ({ id: 'resp-1', name: data.name }));
    const prisma = {
      officialResponsibility: { findUnique: mock(async () => ({ id: 'resp-1' })), update },
    };
    const result = await new ResponsibilitiesService(prisma as never).update('resp-1', '  Mpitarika vaovao  ');
    expect(result).toMatchObject({ name: 'Mpitarika vaovao' });
  });

  it('rejects renaming a responsibility that does not exist', async () => {
    const prisma = { officialResponsibility: { findUnique: mock(async () => null) } };
    await expect(new ResponsibilitiesService(prisma as never).update('missing', 'Any')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects renaming a responsibility to a name that already exists', async () => {
    const prisma = {
      officialResponsibility: {
        findUnique: mock(async () => ({ id: 'resp-1' })),
        update: mock(async () => {
          throw { code: 'P2002' };
        }),
      },
    };
    await expect(new ResponsibilitiesService(prisma as never).update('resp-1', 'Doublon')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
