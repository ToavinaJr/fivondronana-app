import { Injectable } from '@nestjs/common';
import { createPaginatedResponse } from '../../common/pagination.js';
import { PrismaService } from '../database/prisma.service.js';
import { RESPONSIBLE_ROLES } from '../authorization/roles.js';
import type { LeaderQueryDto } from './dto/leader-query.dto.js';
import type { LeaderResponseDto } from './dto/leader-response.dto.js';

@Injectable()
export class LeaderService {
  constructor(private readonly prisma: PrismaService) {}

  async listFacets() {
    const [entities, groups, responsibilities] = await Promise.all([
      this.prisma.entity.findMany({
        where: {
          isActive: true,
          memberships: {
            some: {
              user: { isActive: true, roles: { some: { role: { in: [...RESPONSIBLE_ROLES] } } } },
              group: { isActive: true },
            },
          },
        },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.group.findMany({
        where: {
          isActive: true,
          entity: { isActive: true },
          memberships: {
            some: { user: { isActive: true, roles: { some: { role: { in: [...RESPONSIBLE_ROLES] } } } } },
          },
        },
        orderBy: [{ entity: { name: 'asc' } }, { name: 'asc' }],
        select: { id: true, name: true, entityId: true },
      }),
      this.prisma.officialResponsibility.findMany({
        where: {
          isActive: true,
          assignments: {
            some: { user: { isActive: true, roles: { some: { role: { in: [...RESPONSIBLE_ROLES] } } } } },
          },
        },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
    ]);
    return { entities, groups, responsibilities };
  }

  async list(
    query: LeaderQueryDto,
  ): Promise<{ data: LeaderResponseDto[]; pagination: ReturnType<typeof createPaginatedResponse>['pagination'] }> {
    const term = query.q?.trim();
    const where = {
      isActive: true,
      roles: { some: { role: { in: [...RESPONSIBLE_ROLES] } } },
      membership: {
        is: {
          ...(query.entityId ? { entityId: query.entityId } : {}),
          ...(query.groupId ? { groupId: query.groupId } : {}),
          entity: { isActive: true },
          group: { isActive: true },
        },
      },
      ...(query.responsibilityId
        ? {
            responsibilities: {
              some: { responsibilityId: query.responsibilityId, responsibility: { isActive: true } },
            },
          }
        : {}),
      ...(term
        ? {
            OR: [
              { accountName: { contains: term, mode: 'insensitive' as const } },
              { membership: { is: { entity: { name: { contains: term, mode: 'insensitive' as const } } } } },
              { membership: { is: { group: { name: { contains: term, mode: 'insensitive' as const } } } } },
              {
                responsibilities: {
                  some: { responsibility: { name: { contains: term, mode: 'insensitive' as const } } },
                },
              },
            ],
          }
        : {}),
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ accountName: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          accountName: true,
          membership: {
            select: {
              entity: { select: { id: true, name: true } },
              group: { select: { id: true, name: true } },
            },
          },
          responsibilities: {
            where: { responsibility: { isActive: true } },
            orderBy: { responsibility: { name: 'asc' } },
            select: { responsibility: { select: { name: true } } },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    const data = users.flatMap((user) => {
      if (!user.membership) return [];
      return [
        {
          id: user.id,
          accountName: user.accountName,
          entity: user.membership.entity,
          group: user.membership.group,
          responsibilities: user.responsibilities.map(({ responsibility }) => responsibility.name),
        },
      ];
    });
    return { data, pagination: createPaginatedResponse(data, total, query).pagination };
  }
}
