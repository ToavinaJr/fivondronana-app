import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RESPONSIBLE_ROLES } from '../authorization/roles.js';
import { PrismaService } from '../database/prisma.service.js';

const initialResponsibilities = ['Haim-panahy', 'Fampitaovana', 'Mpitantsoratra', 'Mpitahiry vola'] as const;

@Injectable()
export class ResponsibilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.officialResponsibility.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async create(name: string) {
    try {
      return await this.prisma.officialResponsibility.create({ data: { name: name.trim() } });
    } catch (error) {
      if (isPrismaCode(error, 'P2002')) throw new ConflictException('Cette responsabilité existe déjà.');
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const responsibility = await this.prisma.officialResponsibility.findUnique({
      where: { id },
      select: { id: true, _count: { select: { assignments: true } } },
    });
    if (!responsibility) throw new NotFoundException('Responsabilité introuvable.');
    if (responsibility._count.assignments > 0) {
      throw new ConflictException('Réaffectez les responsables avant de retirer cette responsabilité.');
    }
    try {
      await this.prisma.officialResponsibility.delete({ where: { id } });
    } catch (error) {
      if (isPrismaCode(error, 'P2003')) {
        throw new ConflictException('Réaffectez les responsables avant de retirer cette responsabilité.');
      }
      throw error;
    }
  }

  async assign(userId: string, responsibilityId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true, roles: { select: { role: true } } },
    });
    if (!user?.isActive || !user.roles.some(({ role }) => (RESPONSIBLE_ROLES as readonly string[]).includes(role))) {
      throw new NotFoundException('Responsable introuvable ou désactivé.');
    }
    await this.prisma.userResponsibility.upsert({
      where: { userId_responsibilityId: { userId, responsibilityId } },
      create: { userId, responsibilityId },
      update: {},
    });
  }

  async unassign(userId: string, responsibilityId: string): Promise<void> {
    const result = await this.prisma.userResponsibility.deleteMany({ where: { userId, responsibilityId } });
    if (result.count === 0) throw new NotFoundException('Affectation introuvable.');
  }

  static get initialCatalogue(): readonly string[] {
    return initialResponsibilities;
  }
}

function isPrismaCode(error: unknown, code: string): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
