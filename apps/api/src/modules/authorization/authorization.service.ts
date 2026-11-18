import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { Permission } from './permissions.js';
import { RESPONSIBLE_ROLES, UserRole } from './roles.js';

type AuthorizationUser = {
  isActive: boolean;
  roles: Array<{ role: UserRole }>;
  membership: null | {
    entityId: string;
    entity: { isActive: boolean };
    group: { isActive: boolean };
  };
};

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermission(
    userId: string,
    permission: Permission,
    resourceContext?: { entityId?: string; ownerId?: string },
  ): Promise<boolean> {
    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        roles: { select: { role: true } },
        membership: {
          select: { entityId: true, entity: { select: { isActive: true } }, group: { select: { isActive: true } } },
        },
      },
    })) as AuthorizationUser | null;

    if (!user?.isActive) return false;
    const roles = new Set(user.roles.map(({ role }) => role));
    if (
      permission === Permission.USERS_MANAGE ||
      permission === Permission.ENTITIES_MANAGE ||
      permission === Permission.RESPONSIBILITIES_MANAGE ||
      permission === Permission.CONTACTS_MANAGE
    ) {
      return roles.has(UserRole.ADMINISTRATOR);
    }

    const isResponsible = RESPONSIBLE_ROLES.some((role) => roles.has(role));
    if (!isResponsible) return false;
    if (
      permission === Permission.LEADERS_READ ||
      permission === Permission.CV_READ_ANY ||
      permission === Permission.GENERAL_CONVERSATION ||
      permission === Permission.CONTACTS_READ
    ) {
      return true;
    }
    if (permission === Permission.CV_WRITE_OWN) return resourceContext?.ownerId === userId;
    if (permission === Permission.ENTITY_CONVERSATION_READ || permission === Permission.ENTITY_CONVERSATION_WRITE) {
      return Boolean(
        resourceContext?.entityId &&
          user.membership?.entityId === resourceContext.entityId &&
          user.membership.entity.isActive &&
          user.membership.group.isActive,
      );
    }
    return false;
  }
}
