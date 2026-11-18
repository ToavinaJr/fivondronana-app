import 'reflect-metadata';
import { describe, expect, it, mock } from 'bun:test';
import { CvAccessService } from '../../src/modules/cvs/cv-access.service.js';

describe('responsible CV access', () => {
  it('returns a public CV projection without database identifiers or account internals', async () => {
    const prisma = {
      cv: {
        findFirst: mock(async () => ({
          firstName: 'Tiana',
          lastName: 'Rabe',
          address: 'Antananarivo',
          birthDate: new Date('1990-01-01'),
          birthPlace: null,
          phone: '0341234567',
          email: 'tiana@example.org',
          facebook: null,
          province: 'Analamanga',
          area: 'Avaradrano',
          fivondronana: 'Antananarivo',
          extraPersonal: [],
          extraContact: [],
          branches: [],
          activities: [],
          user: { membership: { group: { name: 'Tily' } } },
          userId: 'private-user-id',
          passwordHash: 'private-hash',
        })),
      },
    };
    const cv = await new CvAccessService(prisma as never).getByUserId('responsible-id');
    expect(cv).toMatchObject({ firstName: 'Tiana', lastName: 'Rabe', phone: '0341234567' });
    expect(cv).not.toHaveProperty('userId');
    expect(cv).not.toHaveProperty('passwordHash');
    expect(prisma.cv.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'responsible-id' }) }),
    );
  });

  it('returns null when a guessed identifier is not an active responsible account', async () => {
    const prisma = { cv: { findFirst: mock(async () => null) } };
    expect(await new CvAccessService(prisma as never).getByUserId('guessed-id')).toBeNull();
  });

  it('paginates all authorized responsible CVs without projecting owner or database IDs', async () => {
    const prisma = {
      cv: {
        findMany: mock(async () => [
          { firstName: 'Tiana', lastName: 'Rabe', user: { membership: { group: { name: 'Mpanazava' } } } },
        ]),
        count: mock(async () => 101),
      },
    };
    const result = await new CvAccessService(prisma as never).listResponsibleCvs({ page: 2, pageSize: 50 });
    expect(result.data).toMatchObject([{ firstName: 'Tiana', lastName: 'Rabe', template: 'Mpanazava' }]);
    expect(result.pagination).toEqual({ page: 2, pageSize: 50, total: 101, totalPages: 3 });
    expect(prisma.cv.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 50, take: 50, select: expect.not.objectContaining({ id: true, userId: true }) }),
    );
  });
});
