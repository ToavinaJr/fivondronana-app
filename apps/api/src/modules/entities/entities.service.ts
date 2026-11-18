import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class EntitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.entity.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        isActive: true,
        groups: { orderBy: { name: 'asc' }, select: { id: true, name: true, isActive: true } },
      },
    });
  }

  async create(name: string) {
    try {
      return await this.prisma.entity.create({ data: { name: name.trim() } });
    } catch (error) {
      if (isPrismaCode(error, 'P2002')) throw new ConflictException('Cette entité existe déjà.');
      throw error;
    }
  }

  async createGroup(entityId: string, name: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, isActive: true },
    });
    if (!entity?.isActive) throw new NotFoundException('Entité introuvable ou désactivée.');
    try {
      return await this.prisma.group.create({ data: { entityId, name: name.trim() } });
    } catch (error) {
      if (isPrismaCode(error, 'P2002')) throw new ConflictException('Ce groupe existe déjà dans cette entité.');
      throw error;
    }
  }

  async setEntityActive(entityId: string, isActive: boolean) {
    try {
      return await this.prisma.entity.update({ where: { id: entityId }, data: { isActive } });
    } catch (error) {
      if (isPrismaCode(error, 'P2025')) throw new NotFoundException('Entité introuvable.');
      throw error;
    }
  }

  async setGroupActive(entityId: string, groupId: string, isActive: boolean) {
    try {
      return await this.prisma.group.update({ where: { id_entityId: { id: groupId, entityId } }, data: { isActive } });
    } catch (error) {
      if (isPrismaCode(error, 'P2025')) throw new NotFoundException('Groupe introuvable.');
      throw error;
    }
  }

  async assignResponsible(userId: string, entityId: string, groupId: string): Promise<void> {
    const [user, group] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } }),
      this.prisma.group.findUnique({
        where: { id: groupId },
        select: { entityId: true, isActive: true, entity: { select: { isActive: true } } },
      }),
    ]);
    if (!user?.isActive) throw new NotFoundException('Compte introuvable ou désactivé.');
    if (!group || group.entityId !== entityId)
      throw new BadRequestException('Ce groupe ne dépend pas de cette entité.');
    if (!group.isActive || !group.entity.isActive)
      throw new BadRequestException('Ce groupe ou cette entité est désactivé.');

    await this.prisma.$transaction(async (transaction) => {
      await transaction.entityMembership.upsert({
        where: { userId },
        create: { userId, entityId, groupId },
        update: { entityId, groupId },
      });
      await transaction.userRole.upsert({
        where: { userId_role: { userId, role: 'RESPONSIBLE' } },
        create: { userId, role: 'RESPONSIBLE' },
        update: {},
      });
    });
  }
}

function isPrismaCode(error: unknown, code: string): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
