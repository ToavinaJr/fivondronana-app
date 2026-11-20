import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createPaginatedResponse, getPaginationOffset } from '../../common/pagination.js';
import { hashOpaqueToken, hashPassword } from '../auth/auth.crypto.js';
import { normalizeEmail, normalizePhone } from '../auth/auth.service.js';
import { isMailingActive } from '../auth/mailing-config.js';
import { SendGridMailer } from '../auth/sendgrid-mailer.js';
import { UserRole } from '../authorization/roles.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateUserAdminDto } from './dto/create-user-admin.dto.js';
import type { UpdateUserAdminDto } from './dto/update-user-admin.dto.js';
import type { UserAdminQueryDto } from './dto/user-admin-query.dto.js';

const invitationLifetimeMs = 24 * 60 * 60 * 1000;

function generateInitialPassword(): string {
  return randomBytes(12).toString('base64url');
}

@Injectable()
export class UsersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: SendGridMailer,
  ) {}

  async list(query: UserAdminQueryDto) {
    const search = query.q?.trim();
    const where = {
      ...(search
        ? {
            OR: [
              { accountName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
              { membership: { is: { entity: { name: { contains: search, mode: 'insensitive' as const } } } } },
              {
                responsibilities: {
                  some: { responsibility: { name: { contains: search, mode: 'insensitive' as const } } },
                },
              },
            ],
          }
        : {}),
      ...(query.entityId ? { membership: { is: { entityId: query.entityId } } } : {}),
      ...(query.responsibilityId ? { responsibilities: { some: { responsibilityId: query.responsibilityId } } } : {}),
    };
    const { skip, take } = getPaginationOffset(query);
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ accountName: 'asc' }, { id: 'asc' }],
        skip,
        take,
        select: {
          id: true,
          accountName: true,
          email: true,
          phone: true,
          isActive: true,
          activatedAt: true,
          createdAt: true,
          updatedAt: true,
          roles: { orderBy: { role: 'asc' }, select: { role: true } },
          membership: {
            select: {
              entity: { select: { id: true, name: true } },
              group: { select: { id: true, name: true } },
            },
          },
          responsibilities: {
            where: { responsibility: { isActive: true } },
            orderBy: { responsibility: { name: 'asc' } },
            select: { responsibility: { select: { id: true, name: true } } },
          },
          invitations: { orderBy: { createdAt: 'desc' }, take: 1, select: { deliveryStatus: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = users.map((user) => ({
      id: user.id,
      accountName: user.accountName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      activatedAt: user.activatedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map(({ role }) => role),
      entity: user.membership?.entity ?? null,
      group: user.membership?.group ?? null,
      responsibilities: user.responsibilities.map(({ responsibility }) => responsibility),
      invitationDeliveryStatus: user.invitations[0]?.deliveryStatus ?? null,
    }));

    return createPaginatedResponse(data, total, query);
  }

  async create(input: CreateUserAdminDto, actorUserId: string) {
    const email = input.email.trim();
    const emailNormalized = normalizeEmail(email);
    const phone = input.phone?.trim() || null;
    const phoneNormalized = phone ? normalizePhone(phone) : null;
    if (phone && (!phoneNormalized || phoneNormalized.length < 7))
      throw new BadRequestException('Le numéro de téléphone est invalide.');
    const mailingActive = isMailingActive();
    if (mailingActive) this.mailer.validateConfiguration();
    const token = randomBytes(32).toString('base64url');
    const initialPassword = mailingActive ? randomBytes(32).toString('base64url') : generateInitialPassword();
    const now = new Date();

    const user = await this.prisma
      .$transaction(async (tx) => {
        const group = await tx.group.findUnique({
          where: { id: input.groupId },
          select: { entityId: true, isActive: true, entity: { select: { isActive: true } } },
        });
        if (!group || group.entityId !== input.entityId)
          throw new BadRequestException('Le groupe ne correspond pas à cette entité.');
        if (!group.isActive || !group.entity.isActive)
          throw new BadRequestException('Le groupe ou l’entité est désactivé.');

        const responsibilities = await tx.officialResponsibility.findMany({
          where: { id: { in: input.responsibilityIds }, isActive: true },
          select: { id: true },
        });
        if (responsibilities.length !== input.responsibilityIds.length)
          throw new BadRequestException('Une ou plusieurs responsabilités sont introuvables ou désactivées.');

        const created = await tx.user.create({
          data: {
            accountName: input.accountName.trim(),
            email,
            emailNormalized,
            phone,
            phoneNormalized,
            passwordHash: await hashPassword(initialPassword),
            isActive: !mailingActive,
            activatedAt: mailingActive ? null : now,
            roles: { create: input.roles.map((role) => ({ role })) },
            membership: { create: { entityId: input.entityId, groupId: input.groupId } },
            responsibilities: { create: input.responsibilityIds.map((responsibilityId) => ({ responsibilityId })) },
          },
          select: { id: true, accountName: true, email: true },
        });
        const invitation = mailingActive
          ? await tx.accountInvitation.create({
              data: {
                userId: created.id,
                tokenHash: hashOpaqueToken(token),
                expiresAt: new Date(now.getTime() + invitationLifetimeMs),
              },
              select: { id: true },
            })
          : null;
        await tx.adminAuditEvent.create({
          data: {
            actorUserId,
            subjectUserId: created.id,
            action: 'USER_CREATED',
            metadata: { fields: ['accountName', 'email', 'phone', 'roles', 'membership', 'responsibilities'] },
          },
        });
        return { user: created, invitationId: invitation?.id };
      })
      .catch((error: unknown) => {
        if (isPrismaCode(error, 'P2002'))
          throw new ConflictException('Un compte utilise déjà cet email ou ce téléphone.');
        throw error;
      });

    if (!mailingActive) {
      return { ...(await this.getAdminUser(user.user.id)), invitationPending: false, initialPassword };
    }
    const invitationDeliveryStatus = await this.deliverInvitation(
      user.user.id,
      user.invitationId as string,
      actorUserId,
      email,
      user.user.accountName,
      token,
    );
    return { ...(await this.getAdminUser(user.user.id)), invitationPending: true, invitationDeliveryStatus };
  }

  async update(userId: string, input: UpdateUserAdminDto, actorUserId: string) {
    if (Object.keys(input).length === 0) throw new BadRequestException('Aucune modification fournie.');
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        accountName: true,
        isActive: true,
        roles: { select: { role: true } },
        membership: { select: { entityId: true, groupId: true } },
      },
    });
    if (!current) throw new NotFoundException('Compte introuvable.');

    const email = input.email?.trim() ?? current.email;
    const emailNormalized = email ? normalizeEmail(email) : null;
    const emailChanged = emailNormalized !== (current.email ? normalizeEmail(current.email) : null);
    const phone = input.phone === undefined ? undefined : input.phone?.trim() || null;
    const phoneNormalized = phone === undefined ? undefined : phone ? normalizePhone(phone) : null;
    if (phone && (!phoneNormalized || phoneNormalized.length < 7))
      throw new BadRequestException('Le numéro de téléphone est invalide.');

    const hasEntity = input.entityId !== undefined;
    const hasGroup = input.groupId !== undefined;
    if (hasEntity !== hasGroup) throw new BadRequestException('L’entité et le groupe doivent être fournis ensemble.');

    const changedFields = Object.keys(input);
    const mailingActive = isMailingActive();
    const token = emailChanged && mailingActive ? randomBytes(32).toString('base64url') : undefined;
    const initialPassword = emailChanged && !mailingActive ? generateInitialPassword() : undefined;
    if (emailChanged && mailingActive) this.mailer.validateConfiguration();
    const now = new Date();
    let invitationId: string | undefined;
    try {
      await this.prisma.$transaction(async (tx) => {
        if (hasEntity && hasGroup) {
          const group = await tx.group.findUnique({
            where: { id: input.groupId },
            select: { entityId: true, isActive: true, entity: { select: { isActive: true } } },
          });
          if (!group || group.entityId !== input.entityId)
            throw new BadRequestException('Le groupe ne correspond pas à cette entité.');
          if (!group.isActive || !group.entity.isActive)
            throw new BadRequestException('Le groupe ou l’entité est désactivé.');
          await tx.entityMembership.upsert({
            where: { userId },
            create: { userId, entityId: input.entityId as string, groupId: input.groupId as string },
            update: { entityId: input.entityId as string, groupId: input.groupId as string },
          });
        }

        if (input.roles?.some((role) => role !== UserRole.ADMINISTRATOR)) {
          const membership = await tx.entityMembership.findUnique({
            where: { userId },
            select: { entity: { select: { isActive: true } }, group: { select: { isActive: true } } },
          });
          if (!membership?.entity.isActive || !membership.group.isActive)
            throw new BadRequestException('Un rôle de responsable exige une entité et un groupe actifs.');
        }

        if (input.responsibilityIds) {
          const responsibilities = await tx.officialResponsibility.findMany({
            where: { id: { in: input.responsibilityIds }, isActive: true },
            select: { id: true },
          });
          if (responsibilities.length !== input.responsibilityIds.length)
            throw new BadRequestException('Une ou plusieurs responsabilités sont introuvables ou désactivées.');
          await tx.userResponsibility.deleteMany({ where: { userId } });
          await tx.userResponsibility.createMany({
            data: input.responsibilityIds.map((responsibilityId) => ({ userId, responsibilityId })),
          });
        }

        if (input.roles) {
          await tx.userRole.deleteMany({ where: { userId } });
          await tx.userRole.createMany({ data: input.roles.map((role) => ({ userId, role })) });
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            ...(input.accountName !== undefined ? { accountName: input.accountName.trim() } : {}),
            ...(emailChanged ? { email, emailNormalized } : {}),
            ...(emailChanged && mailingActive ? { isActive: false, activatedAt: null } : {}),
            ...(phone !== undefined ? { phone, phoneNormalized } : {}),
            ...(emailChanged
              ? {
                  passwordHash: await hashPassword(
                    mailingActive ? randomBytes(32).toString('base64url') : (initialPassword as string),
                  ),
                }
              : {}),
          },
        });

        if (emailChanged && mailingActive && token) {
          await tx.accountInvitation.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: now } });
          const invitation = await tx.accountInvitation.create({
            data: {
              userId,
              tokenHash: hashOpaqueToken(token),
              expiresAt: new Date(now.getTime() + invitationLifetimeMs),
            },
            select: { id: true },
          });
          invitationId = invitation.id;
          await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
        } else if (emailChanged && !mailingActive) {
          await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
        }

        await tx.adminAuditEvent.create({
          data: {
            actorUserId,
            subjectUserId: userId,
            action: 'USER_UPDATED',
            metadata: { fields: changedFields },
          },
        });
      });
    } catch (error) {
      if (isPrismaCode(error, 'P2002'))
        throw new ConflictException('Un compte utilise déjà cet email ou ce téléphone.');
      if (isPrismaCode(error, 'P2025')) throw new NotFoundException('Compte introuvable.');
      throw error;
    }

    const updated = await this.getAdminUser(userId);
    if (emailChanged && !mailingActive && initialPassword) {
      return { ...updated, invitationPending: false, initialPassword };
    }
    if (emailChanged && token && email && invitationId) {
      const invitationDeliveryStatus = await this.deliverInvitation(
        userId,
        invitationId,
        actorUserId,
        email,
        updated.accountName,
        token,
      );
      return { ...updated, invitationPending: true, invitationDeliveryStatus };
    }
    return updated;
  }

  async setActive(userId: string, isActive: boolean, actorUserId: string) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, activatedAt: true },
    });
    if (!current) throw new NotFoundException('Compte introuvable.');
    if (isActive && !current.isActive && !current.activatedAt)
      throw new ConflictException('Le responsable doit activer son compte avant sa réactivation.');
    if (current.isActive === isActive) return this.getAdminUser(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { isActive } });
      if (!isActive) {
        await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await tx.adminAuditEvent.create({
        data: {
          actorUserId,
          subjectUserId: userId,
          action: isActive ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
          metadata: {},
        },
      });
    });
    return this.getAdminUser(userId);
  }

  async resendInvitation(userId: string, actorUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, accountName: true, email: true, isActive: true, activatedAt: true },
    });
    if (!user?.email) throw new NotFoundException('Compte introuvable.');
    if (user.isActive) throw new ConflictException('Ce compte est déjà activé.');
    if (user.activatedAt)
      throw new ConflictException('Ce compte a déjà été activé; réactivez-le sans renvoyer d’invitation.');
    if (!isMailingActive())
      throw new ConflictException('L’envoi de courriels est désactivé (IS_MAILING_ACTIVE=false).');

    this.mailer.validateConfiguration();
    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const invitation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.accountInvitation.create({
        data: {
          userId,
          tokenHash: hashOpaqueToken(token),
          expiresAt: new Date(now.getTime() + invitationLifetimeMs),
        },
        select: { id: true },
      });
      await tx.adminAuditEvent.create({
        data: {
          actorUserId,
          subjectUserId: userId,
          action: 'USER_INVITATION_RESEND_REQUESTED',
          metadata: { invitationId: created.id },
        },
      });
      return created;
    });
    const deliveryStatus = await this.deliverInvitation(
      userId,
      invitation.id,
      actorUserId,
      user.email,
      user.accountName,
      token,
      true,
    );
    return { status: deliveryStatus, retryable: deliveryStatus !== 'SENT' };
  }

  private async getAdminUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountName: true,
        email: true,
        phone: true,
        isActive: true,
        activatedAt: true,
        roles: { orderBy: { role: 'asc' }, select: { role: true } },
        membership: {
          select: { entity: { select: { id: true, name: true } }, group: { select: { id: true, name: true } } },
        },
        responsibilities: {
          where: { responsibility: { isActive: true } },
          orderBy: { responsibility: { name: 'asc' } },
          select: { responsibility: { select: { id: true, name: true } } },
        },
        invitations: { orderBy: { createdAt: 'desc' }, take: 1, select: { deliveryStatus: true } },
      },
    });
    if (!user) throw new NotFoundException('Compte introuvable.');
    return {
      id: user.id,
      accountName: user.accountName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      activatedAt: user.activatedAt,
      roles: user.roles.map(({ role }) => role),
      entity: user.membership?.entity ?? null,
      group: user.membership?.group ?? null,
      responsibilities: user.responsibilities.map(({ responsibility }) => responsibility),
      invitationDeliveryStatus: user.invitations[0]?.deliveryStatus ?? null,
    };
  }

  private async deliverInvitation(
    userId: string,
    invitationId: string,
    actorUserId: string,
    email: string,
    accountName: string,
    token: string,
    invalidatePrevious = false,
  ): Promise<'SENT' | 'FAILED' | 'PENDING' | 'SUPERSEDED'> {
    let sent = false;
    try {
      await this.mailer.sendAccountActivation(email, accountName, token);
      sent = true;
    } catch {
      sent = false;
    }

    let superseded = false;
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        const invitation = await tx.accountInvitation.findUnique({
          where: { id: invitationId },
          select: { consumedAt: true },
        });
        superseded = !invitation || invitation.consumedAt !== null;
        await tx.accountInvitation.updateMany({
          where: { id: invitationId },
          data: { deliveryStatus: superseded ? 'SUPERSEDED' : sent ? 'SENT' : 'FAILED' },
        });
        if (sent && invalidatePrevious && !superseded) {
          await tx.accountInvitation.updateMany({
            where: { userId, id: { not: invitationId }, consumedAt: null },
            data: { consumedAt: new Date(), deliveryStatus: 'SUPERSEDED' },
          });
        }
        await tx.adminAuditEvent.create({
          data: {
            actorUserId,
            subjectUserId: userId,
            action: superseded
              ? 'USER_INVITATION_SUPERSEDED'
              : sent
                ? invalidatePrevious
                  ? 'USER_INVITATION_RESENT'
                  : 'USER_INVITATION_DELIVERED'
                : 'USER_INVITATION_DELIVERY_FAILED',
            metadata: { invitationId },
          },
        });
      });
      if (superseded) return 'SUPERSEDED';
    } catch {
      return 'PENDING';
    }
    return sent ? 'SENT' : 'FAILED';
  }
}

function isPrismaCode(error: unknown, code: string): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
