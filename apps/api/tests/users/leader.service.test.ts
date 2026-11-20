import 'reflect-metadata';
import { describe, expect, it, mock } from 'bun:test';
import { LeaderService } from '../../src/modules/users/leader.service.js';

describe('leader directory service', () => {
  it('returns a bounded stable page and only approved summary fields', async () => {
    const prisma = {
      user: {
        findMany: mock(async () => [
          {
            id: 'leader-1',
            accountName: 'Responsible A',
            membership: {
              entity: { id: 'entity-1', name: 'Mavo' },
              group: { id: 'group-1', name: 'Tily' },
            },
            responsibilities: [{ responsibility: { name: 'Haim-panahy' } }],
            avatarKey: null,
            cv: null,
            passwordHash: 'must-not-return',
          },
        ]),
        count: mock(async () => 21),
      },
    };
    const result = await new LeaderService(prisma as never).list({ page: 2, pageSize: 10 });
    expect(result).toEqual({
      data: [
        {
          id: 'leader-1',
          accountName: 'Responsible A',
          entity: { id: 'entity-1', name: 'Mavo' },
          group: { id: 'group-1', name: 'Tily' },
          responsibilities: ['Haim-panahy'],
          hasAvatar: false,
          hasCv: false,
        },
      ],
      pagination: { page: 2, pageSize: 10, total: 21, totalPages: 3 },
    });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    expect(JSON.stringify(result)).not.toContain('must-not-return');
  });

  it('reports hasCv when the leader has filled in their curriculum vitae', async () => {
    const prisma = {
      user: {
        findMany: mock(async () => [
          {
            id: 'leader-2',
            accountName: 'Responsible B',
            membership: {
              entity: { id: 'entity-1', name: 'Mavo' },
              group: { id: 'group-1', name: 'Tily' },
            },
            responsibilities: [],
            avatarKey: null,
            cv: { id: 'cv-1' },
          },
        ]),
        count: mock(async () => 1),
      },
    };
    const result = await new LeaderService(prisma as never).list({ page: 1, pageSize: 20 });
    expect(result.data[0]?.hasCv).toBe(true);
  });

  it('normalizes search and combines entity, group, and responsibility filters', async () => {
    const prisma = {
      user: {
        findMany: mock(async (_args: { where: { OR?: unknown[] } & Record<string, unknown> }) => []),
        count: mock(async () => 0),
      },
    };
    const service = new LeaderService(prisma as never);
    await service.list({
      page: 1,
      pageSize: 20,
      q: '  Tiana ',
      entityId: 'entity-1',
      groupId: 'group-1',
      responsibilityId: 'resp-1',
    });
    const where = prisma.user.findMany.mock.calls[0]?.[0].where;
    expect(where).toMatchObject({
      isActive: true,
      membership: {
        is: { entityId: 'entity-1', groupId: 'group-1', entity: { isActive: true }, group: { isActive: true } },
      },
      responsibilities: { some: { responsibilityId: 'resp-1', responsibility: { isActive: true } } },
    });
    expect(where.OR).toHaveLength(4);
    expect(where.OR?.[0]).toEqual({ accountName: { contains: 'Tiana', mode: 'insensitive' } });
  });

  it('only treats an active responsible with an active membership as a visible leader', async () => {
    const found = mock(async (): Promise<{ id: string } | null> => ({ id: 'leader-1' }));
    const service = new LeaderService({ user: { findFirst: found } } as never);

    await expect(service.assertVisible('leader-1')).resolves.toBeUndefined();

    found.mockImplementationOnce(async () => null);
    await expect(service.assertVisible('missing')).rejects.toThrow('Tsy hita ny mpiandraikitra.');
  });
});
