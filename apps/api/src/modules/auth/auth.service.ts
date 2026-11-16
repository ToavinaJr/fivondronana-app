import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';
import { hashPassword, issueAccessToken, validateJwtSecret, verifyPassword } from './auth.crypto.js';

type Account = { id: string; accountName: string; email: string | null; emailNormalized?: string | null; phone: string | null; phoneNormalized?: string | null; passwordHash: string; isActive: boolean };
export type AuthenticatedUser = { id: string; accountName: string; email: string | null; phone: string | null };

@Injectable()
export class AuthService {
  private readonly secret: string;

  constructor(private readonly prisma: PrismaService, secret = process.env['JWT_SECRET']) {
    this.secret = validateJwtSecret(secret);
  }

  async login(identifier: string, password: string) {
    const normalizedEmail = identifier.includes('@') ? normalizeEmail(identifier) : undefined;
    const normalizedPhone = normalizedEmail ? undefined : normalizePhone(identifier);
    const account = await this.prisma.user.findFirst({
      where: normalizedEmail ? { emailNormalized: normalizedEmail } : { phoneNormalized: normalizedPhone },
    }) as Account | null;
    if (!account || !account.isActive || !(await verifyPassword(password, account.passwordHash))) {
      throw new UnauthorizedException('Identifiants invalides ou compte désactivé.');
    }

    const sessionId = randomUUID();
    const token = issueAccessToken(account.id, sessionId, this.secret);
    await this.prisma.authSession.create({ data: { id: sessionId, userId: account.id, expiresAt: token.expiresAt } });
    return { accessToken: token.token, tokenType: 'Bearer' as const, expiresIn: token.expiresIn, user: toAuthenticatedUser(account) };
  }

  async getSession(sessionId: string) {
    return this.prisma.authSession.findUnique({ where: { id: sessionId }, include: { user: true } });
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.authSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    const account = await this.prisma.user.findUnique({ where: { id: userId } }) as Account | null;
    if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
      throw new UnauthorizedException('Le mot de passe actuel est incorrect.');
    }
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }
}

export function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, '');
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function toAuthenticatedUser(account: Pick<Account, 'id' | 'accountName' | 'email' | 'phone'>): AuthenticatedUser {
  return { id: account.id, accountName: account.accountName, email: account.email, phone: account.phone };
}
