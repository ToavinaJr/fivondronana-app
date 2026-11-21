import { Injectable } from '@nestjs/common';
import { createPaginatedResponse, type PaginationQueryDto } from '../../common/pagination.js';
import { RESPONSIBLE_ROLES } from '../authorization/roles.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CvResponseDto } from './dto/cv-response.dto.js';

@Injectable()
export class CvAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getByUserId(userId: string): Promise<CvResponseDto | null> {
    const cv = await this.prisma.cv.findFirst({
      where: {
        userId,
        user: {
          isActive: true,
          roles: { some: { role: { in: [...RESPONSIBLE_ROLES] } } },
          membership: { is: { entity: { isActive: true }, group: { isActive: true } } },
        },
      },
      select: {
        firstName: true,
        lastName: true,
        address: true,
        birthDate: true,
        birthPlace: true,
        phone: true,
        email: true,
        facebook: true,
        province: true,
        area: true,
        fivondronana: true,
        extraPersonal: true,
        extraContact: true,
        branches: { select: { name: true, group: true, project: true, startedAt: true, endedAt: true } },
        activities: { select: { name: true, responsibility: true, description: true, date: true } },
        user: { select: { membership: { select: { group: { select: { name: true } } } } } },
      },
    });
    if (!cv) return null;
    return {
      firstName: cv.firstName,
      lastName: cv.lastName,
      address: cv.address,
      birthDate: cv.birthDate,
      birthPlace: cv.birthPlace,
      phone: cv.phone,
      email: cv.email,
      facebook: cv.facebook,
      province: cv.province,
      area: cv.area,
      fivondronana: cv.fivondronana,
      extraPersonal: parseExtraFields(cv.extraPersonal),
      extraContact: parseExtraFields(cv.extraContact),
      branches: cv.branches,
      activities: cv.activities,
      template: getTemplate(cv.user.membership?.group.name),
    };
  }

  async listResponsibleCvs(query: PaginationQueryDto) {
    const where = {
      user: {
        isActive: true,
        roles: { some: { role: { in: [...RESPONSIBLE_ROLES] } } },
        membership: { is: { entity: { isActive: true }, group: { isActive: true } } },
      },
    };
    const select = {
      firstName: true,
      lastName: true,
      address: true,
      birthDate: true,
      birthPlace: true,
      phone: true,
      email: true,
      facebook: true,
      province: true,
      area: true,
      fivondronana: true,
      extraPersonal: true,
      extraContact: true,
      branches: { select: { name: true, group: true, project: true, startedAt: true, endedAt: true } },
      activities: { select: { name: true, responsibility: true, description: true, date: true } },
    } as const;
    const [rows, total] = await Promise.all([
      this.prisma.cv.findMany({
        where,
        orderBy: [{ user: { accountName: 'asc' } }, { userId: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: { ...select, user: { select: { membership: { select: { group: { select: { name: true } } } } } } },
      }),
      this.prisma.cv.count({ where }),
    ]);
    const data = rows.map(({ user, ...cv }) => ({
      ...cv,
      extraPersonal: parseExtraFields(cv.extraPersonal),
      extraContact: parseExtraFields(cv.extraContact),
      template: getTemplate(user.membership?.group.name),
    }));
    return createPaginatedResponse(data, total, query);
  }
}

function getTemplate(groupName: string | undefined): 'Tily' | 'Mpanazava' | null {
  return groupName === 'Tily' || groupName === 'Mpanazava' ? groupName : null;
}

export function parseExtraFields(value: unknown): Array<{ label: string; value: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof (item as Record<string, unknown>).label !== 'string' ||
      typeof (item as Record<string, unknown>).value !== 'string'
    )
      return [];
    const { label, value: fieldValue } = item as { label: string; value: string };
    return [{ label, value: fieldValue }];
  });
}
