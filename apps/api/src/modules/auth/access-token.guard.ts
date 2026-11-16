import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser, AuthService, toAuthenticatedUser } from './auth.service.js';
import { validateJwtSecret, verifyAccessToken } from './auth.crypto.js';

export type AuthenticatedRequest = {
  headers: { authorization?: string };
  auth: { user: AuthenticatedUser; sessionId: string };
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly secret = validateJwtSecret(process.env['JWT_SECRET']);

  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Jeton d’accès manquant.');
    let claims;
    try {
      claims = verifyAccessToken(token, this.secret);
    } catch {
      throw new UnauthorizedException('Jeton d’accès invalide ou expiré.');
    }

    const session = await this.auth.getSession(claims.sid);
    if (!session || session.userId !== claims.sub || session.revokedAt || session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }
    request.auth = { user: toAuthenticatedUser(session.user), sessionId: session.id };
    return true;
  }
}
