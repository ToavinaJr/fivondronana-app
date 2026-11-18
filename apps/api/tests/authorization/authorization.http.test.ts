import 'reflect-metadata';
import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterEach, describe, expect, it } from 'bun:test';
import { configureApiApp } from '../../src/api-bootstrap.js';
import { AccessTokenGuard } from '../../src/modules/auth/access-token.guard.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { issueAccessToken } from '../../src/modules/auth/auth.crypto.js';
import { AuthorizationService } from '../../src/modules/authorization/authorization.service.js';
import { RequirePermission } from '../../src/modules/authorization/authorization.decorator.js';
import { Permission } from '../../src/modules/authorization/permissions.js';
import { RequirePermissionsGuard } from '../../src/modules/authorization/require-permissions.guard.js';

const secret = 'authorization-http-test-secret-over-32-chars';
const sessions = new Map<
  string,
  {
    id: string;
    userId: string;
    revokedAt: Date | null;
    expiresAt: Date;
    user: { id: string; accountName: string; email: string | null; phone: string | null; isActive: boolean };
  }
>();

@Controller('admin-probe')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
class AuthorizationProbeController {
  @Get()
  @RequirePermission(Permission.USERS_MANAGE)
  read() {
    return { allowed: true };
  }
}

@Module({
  controllers: [AuthorizationProbeController],
  providers: [
    AccessTokenGuard,
    RequirePermissionsGuard,
    { provide: AuthService, useValue: { getSession: async (id: string) => sessions.get(id) ?? null } },
    { provide: AuthorizationService, useValue: { hasPermission: async (userId: string) => userId === 'admin' } },
  ],
})
class AuthorizationProbeModule {}

describe('authorization HTTP boundary', () => {
  const previousSecret = process.env.JWT_SECRET;
  let app: NestExpressApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    sessions.clear();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('rejects unauthenticated, revoked, disabled, and ordinary users; permits an administrator', async () => {
    process.env.JWT_SECRET = secret;
    app = await NestFactory.create<NestExpressApplication>(AuthorizationProbeModule, {
      bodyParser: false,
      logger: false,
    });
    configureApiApp(app);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as { port: number };
    const url = `http://127.0.0.1:${address.port}/api/admin-probe`;

    const addSession = (id: string, userId: string, isActive = true, revokedAt: Date | null = null) => {
      sessions.set(id, {
        id,
        userId,
        revokedAt,
        expiresAt: new Date(Date.now() + 60_000),
        user: { id: userId, accountName: userId, email: null, phone: null, isActive },
      });
      return issueAccessToken(userId, id, secret).token;
    };

    const ordinaryToken = addSession('ordinary-session', 'responsible');
    const adminToken = addSession('admin-session', 'admin');
    const revokedToken = addSession('revoked-session', 'admin', true, new Date());
    const disabledToken = addSession('disabled-session', 'admin', false);

    expect((await fetch(url)).status).toBe(401);
    expect((await fetch(url, { headers: { Authorization: `Bearer ${revokedToken}` } })).status).toBe(401);
    expect((await fetch(url, { headers: { Authorization: `Bearer ${disabledToken}` } })).status).toBe(401);
    expect((await fetch(url, { headers: { Authorization: `Bearer ${ordinaryToken}` } })).status).toBe(403);
    const authorized = await fetch(url, { headers: { Authorization: `Bearer ${adminToken}` } });
    expect(authorized.status).toBe(200);
    expect(await authorized.json()).toEqual({ allowed: true });
  });
});
