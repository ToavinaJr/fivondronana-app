import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { getAllowedOrigins } from '../../http-security.js';
import { type AccessClaims, validateJwtSecret, verifyAccessToken } from './auth.crypto.js';
import { type Account, type AuthenticatedUser, AuthService, toAuthenticatedUser } from './auth.service.js';
import { ACCESS_COOKIE, browserMutationAllowed, readCookie } from './browser-session.js';

export type AuthenticatedRequest = {
  method?: string;
  headers: { authorization?: string; cookie?: string; origin?: string; 'x-csrf-token'?: string };
  auth: { user: AuthenticatedUser; sessionId: string };
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly secret = validateJwtSecret(process.env.JWT_SECRET);

  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, bearerToken] = request.headers.authorization?.split(' ') ?? [];
    const cookieToken = readCookie(request.headers.cookie, ACCESS_COOKIE);
    const token = scheme === 'Bearer' ? bearerToken : cookieToken;
    if (!token) throw new UnauthorizedException('Jeton d’accès manquant.');
    if (
      scheme !== 'Bearer' &&
      !browserMutationAllowed(request.method ?? 'GET', request.headers, getAllowedOrigins(process.env))
    ) {
      throw new ForbiddenException('Vérification de sécurité du navigateur échouée.');
    }
    let claims: AccessClaims;
    try {
      claims = verifyAccessToken(token, this.secret);
    } catch {
      throw new UnauthorizedException('Jeton d’accès invalide ou expiré.');
    }

    const session = await this.auth.getSession(claims.sid);
    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      !session.user.isActive
    ) {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }
    request.auth = { user: toAuthenticatedUser(session.user as Account), sessionId: session.id };
    return true;
  }
}
