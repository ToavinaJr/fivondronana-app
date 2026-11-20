import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type { PrismaService } from '../database/prisma.service.js';
import { hashOpaqueToken, hashPassword, issueAccessToken, validateJwtSecret, verifyPassword } from './auth.crypto.js';

type Account = {
  id: string;
  accountName: string;
  email: string | null;
  emailNormalized?: string | null;
  phone: string | null;
  phoneNormalized?: string | null;
  passwordHash: string;
  isActive: boolean;
};
export type AuthenticatedUser = { id: string; accountName: string; email: string | null; phone: string | null };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    secret = process.env.JWT_SECRET,
    private readonly mailer?: import('./sendgrid-mailer.js').SendGridMailer,
  ) {
    this.secret = validateJwtSecret(secret);
  }

  async login(identifier: string, password: string, rememberMe = false) {
    const normalizedEmail = identifier.includes('@') ? normalizeEmail(identifier) : undefined;
    const normalizedPhone = normalizedEmail ? undefined : normalizePhone(identifier);
    const account = (await this.prisma.user.findFirst({
      where: normalizedEmail ? { emailNormalized: normalizedEmail } : { phoneNormalized: normalizedPhone },
    })) as Account | null;
    if (!account?.isActive || !(await verifyPassword(password, account.passwordHash))) {
      throw new UnauthorizedException('Identifiants invalides ou compte désactivé.');
    }

    const sessionId = randomUUID();
    const now = new Date();
    const token = issueAccessToken(account.id, sessionId, this.secret, now.getTime());
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresIn = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        userId: account.id,
        expiresAt: new Date(now.getTime() + refreshExpiresIn * 1000),
        refreshTokenHash: hashOpaqueToken(refreshToken),
      },
    });
    return {
      accessToken: token.token,
      refreshToken,
      tokenType: 'Bearer' as const,
      expiresIn: token.expiresIn,
      refreshExpiresIn,
      user: toAuthenticatedUser(account),
    };
  }

  async refresh(refreshToken: string) {
    const now = new Date();
    const refreshTokenHash = hashOpaqueToken(refreshToken);
    const session = await this.prisma.authSession.findFirst({
      where: { refreshTokenHash, revokedAt: null, expiresAt: { gt: now } },
      include: { user: true },
    });
    if (!session?.user.isActive) throw new UnauthorizedException('Session invalide ou expirée.');

    const nextRefreshToken = randomBytes(32).toString('base64url');
    const rotated = await this.prisma.authSession.updateMany({
      where: { id: session.id, refreshTokenHash, revokedAt: null, expiresAt: { gt: now } },
      data: { refreshTokenHash: hashOpaqueToken(nextRefreshToken) },
    });
    if (rotated.count !== 1) throw new UnauthorizedException('Session invalide ou expirée.');

    const accessToken = issueAccessToken(session.userId, session.id, this.secret, now.getTime());
    return {
      accessToken: accessToken.token,
      refreshToken: nextRefreshToken,
      tokenType: 'Bearer' as const,
      expiresIn: accessToken.expiresIn,
      refreshExpiresIn: Math.max(0, Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000)),
      user: toAuthenticatedUser(session.user),
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { refreshTokenHash: hashOpaqueToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getSession(sessionId: string) {
    return this.prisma.authSession.findUnique({ where: { id: sessionId }, include: { user: true } });
  }

  async getBrowserIdentity(userId: string) {
    const account = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { select: { role: true } } },
    });
    if (!account) throw new UnauthorizedException('Session invalide ou expirée.');
    return { ...toAuthenticatedUser(account), roles: account.roles.map(({ role }) => role) };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.authSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8)
      throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    const account = (await this.prisma.user.findUnique({ where: { id: userId } })) as Account | null;
    if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
      throw new UnauthorizedException('Le mot de passe actuel est incorrect.');
    }
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }

  async activateAccount(token: string, password: string): Promise<void> {
    if (password.length < 8) throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    const invitation = await this.prisma.accountInvitation.findUnique({
      where: { tokenHash: hashOpaqueToken(token) },
      select: { id: true, userId: true, expiresAt: true, consumedAt: true },
    });
    const now = new Date();
    if (!invitation || invitation.consumedAt || invitation.expiresAt <= now) {
      throw new BadRequestException('Le lien d’activation est invalide ou expiré.');
    }

    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction(async (tx) => {
      const activated = await tx.user.updateMany({
        where: { id: invitation.userId, isActive: false },
        data: { isActive: true, passwordHash, activatedAt: now },
      });
      if (activated.count !== 1) throw new BadRequestException('Le lien d’activation est invalide ou expiré.');

      const consumed = await tx.accountInvitation.updateMany({
        where: { id: invitation.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw new BadRequestException('Le lien d’activation est invalide ou expiré.');

      await tx.accountInvitation.updateMany({
        where: { userId: invitation.userId, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.adminAuditEvent.create({
        data: {
          actorUserId: invitation.userId,
          subjectUserId: invitation.userId,
          action: 'USER_ACTIVATED',
          metadata: {},
        },
      });
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.prisma.user.findUnique({ where: { emailNormalized: normalizedEmail } });
    if (!user?.isActive || !user.email || !this.mailer) return;

    const now = new Date();
    const recentRequests = await this.prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gt: new Date(now.getTime() - 15 * 60 * 1000) } },
    });
    if (recentRequests >= 3) return;

    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashOpaqueToken(token);
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + 30 * 60 * 1000) },
    });
    try {
      await this.mailer.sendPasswordReset(user.email, user.accountName, token);
    } catch {
      await this.prisma.passwordResetToken.updateMany({
        where: { tokenHash, consumedAt: null },
        data: { consumedAt: now },
      });
      this.logger.warn('Password recovery email delivery failed.');
    }
  }

  async completePasswordReset(token: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8)
      throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    const tokenHash = hashOpaqueToken(token);
    const now = new Date();
    const reset = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!reset || reset.consumedAt || reset.expiresAt <= now) {
      throw new BadRequestException('Le lien de réinitialisation est invalide ou expiré.');
    }
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: reset.id, tokenHash, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw new BadRequestException('Le lien de réinitialisation est invalide ou expiré.');
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
      await tx.authSession.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: reset.userId, id: { not: reset.id }, consumedAt: null },
        data: { consumedAt: now },
      });
    });
  }
}

export function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, '');
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function toAuthenticatedUser(
  account: Pick<Account, 'id' | 'accountName' | 'email' | 'phone'>,
): AuthenticatedUser {
  return { id: account.id, accountName: account.accountName, email: account.email, phone: account.phone };
}
