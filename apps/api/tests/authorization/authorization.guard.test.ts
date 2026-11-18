import { describe, expect, it, mock } from 'bun:test';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { RequirePermissionsGuard } from '../../src/modules/authorization/require-permissions.guard.js';
import { Permission } from '../../src/modules/authorization/permissions.js';
import { AccessTokenGuard } from '../../src/modules/auth/access-token.guard.js';
import { issueAccessToken } from '../../src/modules/auth/auth.crypto.js';

function context(params: Record<string, string> = {}) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ auth: { user: { id: 'ordinary-user' } }, params }),
    }),
  } as never;
}

describe('permission guard', () => {
  it('denies requests when the authenticated user lacks the required permission', async () => {
    const reflector = { getAllAndOverride: () => Permission.USERS_MANAGE };
    const authorization = { hasPermission: mock(async () => false) };
    const guard = new RequirePermissionsGuard(reflector as never, authorization as never);
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(ForbiddenException);
    expect(authorization.hasPermission).toHaveBeenCalledWith('ordinary-user', Permission.USERS_MANAGE, {
      entityId: undefined,
      ownerId: undefined,
    });
  });

  it('checks a resource owner rather than trusting a client permission claim', async () => {
    const reflector = { getAllAndOverride: () => Permission.CV_WRITE_OWN };
    const authorization = { hasPermission: mock(async () => false) };
    const guard = new RequirePermissionsGuard(reflector as never, authorization as never);
    await expect(guard.canActivate(context({ userId: 'another-user' }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(authorization.hasPermission).toHaveBeenCalledWith('ordinary-user', Permission.CV_WRITE_OWN, {
      entityId: undefined,
      ownerId: 'another-user',
    });
  });
});

describe('access token guard session validation', () => {
  const secret = 'session-guard-test-secret-with-at-least-32-chars';

  it('rejects unauthenticated, revoked, and disabled sessions', async () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = secret;
    try {
      const revokedToken = issueAccessToken('user-1', 'session-1', secret).token;
      const revokedGuard = new AccessTokenGuard({
        getSession: async () => ({
          id: 'session-1',
          userId: 'user-1',
          revokedAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
          user: { isActive: true },
        }),
      } as never);
      await expect(revokedGuard.canActivate(authContext(revokedToken))).rejects.toBeInstanceOf(UnauthorizedException);

      const disabledGuard = new AccessTokenGuard({
        getSession: async () => ({
          id: 'session-1',
          userId: 'user-1',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          user: { isActive: false },
        }),
      } as never);
      await expect(disabledGuard.canActivate(authContext(revokedToken))).rejects.toBeInstanceOf(UnauthorizedException);

      const missingTokenGuard = new AccessTokenGuard({ getSession: async () => null } as never);
      await expect(missingTokenGuard.canActivate(authContext(undefined))).rejects.toBeInstanceOf(UnauthorizedException);
    } finally {
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
    }
  });
});

function authContext(token: string | undefined) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: token ? `Bearer ${token}` : undefined } }) }),
  } as never;
}
