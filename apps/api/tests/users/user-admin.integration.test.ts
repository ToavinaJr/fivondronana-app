import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApiApp } from '../../src/api-bootstrap.js';
import { AppModule } from '../../src/app.module.js';
import { hashPassword } from '../../src/modules/auth/auth.crypto.js';
import { PrismaService } from '../../src/modules/database/prisma.service.js';

const connectionString = process.env.DATABASE_URL_TEST;
const databaseUrl = connectionString ? new URL(connectionString) : null;
if (databaseUrl && !databaseUrl.pathname.toLowerCase().endsWith('_test')) {
  throw new Error('DATABASE_URL_TEST must point to a disposable database whose name ends with _test.');
}

describe.skipIf(!connectionString)('administrator user management HTTP API', () => {
  let prisma: PrismaService;
  let app: NestExpressApplication | undefined;
  let baseUrl: string;
  let adminId: string;
  let targetId: string;
  const createdUserIds: string[] = [];
  const createdEntityIds: string[] = [];
  const createdGroupIds: string[] = [];
  const createdResponsibilityIds: string[] = [];
  let adminToken: string;
  let previousDatabaseUrl: string | undefined;
  let previousJwtSecret: string | undefined;
  let previousSendGridApiKey: string | undefined;
  let previousSendGridFromEmail: string | undefined;
  let previousBackofficeUrl: string | undefined;
  let previousIsMailingActive: string | undefined;
  const suffix = randomUUID();
  const adminEmail = `admin-${suffix}@example.test`;

  beforeAll(async () => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    previousJwtSecret = process.env.JWT_SECRET;
    previousSendGridApiKey = process.env.SENDGRID_API_KEY;
    previousSendGridFromEmail = process.env.SENDGRID_FROM_EMAIL;
    previousBackofficeUrl = process.env.BACKOFFICE_URL;
    previousIsMailingActive = process.env.IS_MAILING_ACTIVE;
    process.env.DATABASE_URL = connectionString;
    process.env.JWT_SECRET = 'user-admin-integration-secret-over-32-characters';
    process.env.SENDGRID_API_KEY = 'integration-sendgrid-key';
    process.env.SENDGRID_FROM_EMAIL = 'noreply@example.test';
    process.env.BACKOFFICE_URL = 'https://backoffice.example.test';
    // Force the email-required activation flow regardless of the developer's local .env;
    // tests that need IS_MAILING_ACTIVE=false set and restore it themselves.
    delete process.env.IS_MAILING_ACTIVE;

    app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
    configureApiApp(app);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api`;
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const leakedUsers = await prisma.user.findMany({
      where: { OR: [{ accountName: { contains: suffix } }, { emailNormalized: { contains: suffix } }] },
      select: { id: true },
    });
    const userIds = [
      ...new Set([adminId, targetId, ...createdUserIds, ...leakedUsers.map(({ id }) => id)].filter(Boolean)),
    ];
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (createdGroupIds.length) await prisma.group.deleteMany({ where: { id: { in: createdGroupIds } } });
    if (createdEntityIds.length) await prisma.entity.deleteMany({ where: { id: { in: createdEntityIds } } });
    if (createdResponsibilityIds.length)
      await prisma.officialResponsibility.deleteMany({ where: { id: { in: createdResponsibilityIds } } });
    await app?.close();
    restoreEnvironment('DATABASE_URL', previousDatabaseUrl);
    restoreEnvironment('JWT_SECRET', previousJwtSecret);
    restoreEnvironment('SENDGRID_API_KEY', previousSendGridApiKey);
    restoreEnvironment('SENDGRID_FROM_EMAIL', previousSendGridFromEmail);
    restoreEnvironment('BACKOFFICE_URL', previousBackofficeUrl);
    restoreEnvironment('IS_MAILING_ACTIVE', previousIsMailingActive);
  });

  it('allows an administrator to search accounts and never returns credential or session secrets', async () => {
    const admin = await prisma.user.create({
      data: {
        accountName: `Admin ${suffix}`,
        email: adminEmail,
        emailNormalized: adminEmail,
        passwordHash: await hashPassword('integration-password'),
        roles: { create: [{ role: 'ADMINISTRATOR' }] },
      },
    });
    adminId = admin.id;
    const targetEmail = `target-${suffix}@example.test`;
    const target = await prisma.user.create({
      data: {
        accountName: `Responsible ${suffix}`,
        email: targetEmail,
        emailNormalized: targetEmail,
        phone: '+261340000001',
        phoneNormalized: '261340000001',
        passwordHash: await hashPassword('responsible-password'),
        activatedAt: new Date(),
        roles: { create: [{ role: 'RESPONSIBLE' }] },
      },
    });
    targetId = target.id;

    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: adminEmail, password: 'integration-password' }),
    });
    expect(login.status).toBe(200);
    adminToken = ((await login.json()) as { accessToken: string }).accessToken;

    const response = await fetch(`${baseUrl}/admin/users?q=${encodeURIComponent(suffix)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { data: Array<Record<string, unknown>>; pagination: unknown };
    expect(payload.data).toHaveLength(2);
    expect(payload.data.map((user) => user.accountName)).toContain(`Responsible ${suffix}`);
    for (const user of payload.data) {
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('sessions');
      expect(user).not.toHaveProperty('emailNormalized');
      expect(user).not.toHaveProperty('phoneNormalized');
    }
  });

  it('starts with the approved official responsibility catalogue', async () => {
    const catalogue = await prisma.officialResponsibility.findMany({
      where: { name: { in: ['Haim-panahy', 'Fampitaovana', 'Mpitantsoratra', 'Mpitahiry vola'] } },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    expect(catalogue.map(({ name }) => name)).toEqual([
      'Fampitaovana',
      'Haim-panahy',
      'Mpitahiry vola',
      'Mpitantsoratra',
    ]);
  });

  it('rejects a responsible account from the administrator user directory', async () => {
    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: `target-${suffix}@example.test`, password: 'responsible-password' }),
    });
    expect(login.status).toBe(200);
    const responsibleToken = ((await login.json()) as { accessToken: string }).accessToken;
    const response = await fetch(`${baseUrl}/admin/users`, {
      headers: { Authorization: `Bearer ${responsibleToken}` },
    });
    expect(response.status).toBe(403);
  });

  it('rejects assigning a responsible role when the account has no entity/group membership', async () => {
    const adminWithoutMembership = await prisma.user.create({
      data: {
        accountName: `Unassigned admin ${suffix}`,
        email: `unassigned-${suffix}@example.test`,
        emailNormalized: `unassigned-${suffix}@example.test`,
        passwordHash: await hashPassword('integration-password'),
        roles: { create: [{ role: 'ADMINISTRATOR' }] },
      },
      select: { id: true },
    });
    createdUserIds.push(adminWithoutMembership.id);

    const response = await fetch(`${baseUrl}/admin/users/${adminWithoutMembership.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: ['RESPONSIBLE'] }),
    });
    expect(response.status).toBe(400);
    expect(
      await prisma.userRole.findMany({ where: { userId: adminWithoutMembership.id }, select: { role: true } }),
    ).toEqual([{ role: 'ADMINISTRATOR' }]);
  });

  it('preserves the previous invitation if delivering its replacement fails', async () => {
    const entity = await prisma.entity.create({ data: { name: `Resend Entity ${suffix}` } });
    createdEntityIds.push(entity.id);
    const group = await prisma.group.create({ data: { name: `Resend Group ${suffix}`, entityId: entity.id } });
    createdGroupIds.push(group.id);
    const responsibility = await prisma.officialResponsibility.create({ data: { name: `Resend Role ${suffix}` } });
    createdResponsibilityIds.push(responsibility.id);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('api.sendgrid.com')) return new Response(null, { status: 202 });
      return originalFetch(input, init);
    }) as typeof fetch;
    try {
      const createdResponse = await fetch(`${baseUrl}/admin/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: `Resend target ${suffix}`,
          email: `resend-${suffix}@example.test`,
          entityId: entity.id,
          groupId: group.id,
          responsibilityIds: [responsibility.id],
          roles: ['RESPONSIBLE'],
        }),
      });
      expect(createdResponse.status).toBe(201);
      const created = (await createdResponse.json()) as { id: string };
      createdUserIds.push(created.id);
      const originalInvitation = await prisma.accountInvitation.findFirstOrThrow({ where: { userId: created.id } });

      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('api.sendgrid.com')) return new Response(null, { status: 503 });
        return originalFetch(input, init);
      }) as typeof fetch;
      const resendResponse = await fetch(`${baseUrl}/admin/users/${created.id}/invitation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(resendResponse.status).toBe(201);
      expect(await resendResponse.json()).toEqual({ status: 'FAILED', retryable: true });
      expect(await prisma.accountInvitation.findUniqueOrThrow({ where: { id: originalInvitation.id } })).toMatchObject({
        consumedAt: null,
      });
      expect(
        await prisma.adminAuditEvent.count({
          where: { subjectUserId: created.id, action: 'USER_INVITATION_DELIVERY_FAILED' },
        }),
      ).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('keeps failed initial email delivery visible and retryable without losing the account', async () => {
    const entity = await prisma.entity.create({ data: { name: `Delivery Entity ${suffix}` } });
    createdEntityIds.push(entity.id);
    const group = await prisma.group.create({ data: { name: `Delivery Group ${suffix}`, entityId: entity.id } });
    createdGroupIds.push(group.id);
    const responsibility = await prisma.officialResponsibility.create({ data: { name: `Delivery Role ${suffix}` } });
    createdResponsibilityIds.push(responsibility.id);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('api.sendgrid.com')) return new Response(null, { status: 503 });
      return originalFetch(input, init);
    }) as typeof fetch;
    try {
      const response = await fetch(`${baseUrl}/admin/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: `Delivery target ${suffix}`,
          email: `delivery-${suffix}@example.test`,
          entityId: entity.id,
          groupId: group.id,
          responsibilityIds: [responsibility.id],
          roles: ['RESPONSIBLE'],
        }),
      });
      expect(response.status).toBe(201);
      const payload = (await response.json()) as { id: string; invitationDeliveryStatus: string };
      createdUserIds.push(payload.id);
      expect(payload.invitationDeliveryStatus).toBe('FAILED');
      expect(await prisma.accountInvitation.findFirstOrThrow({ where: { userId: payload.id } })).toMatchObject({
        deliveryStatus: 'FAILED',
        consumedAt: null,
      });
      const listed = await fetch(`${baseUrl}/admin/users?q=${encodeURIComponent(`delivery-${suffix}`)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(((await listed.json()) as { data: Array<{ invitationDeliveryStatus: string }> }).data[0]).toMatchObject({
        invitationDeliveryStatus: 'FAILED',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('serializes concurrent invitation resends and reports the superseded delivery', async () => {
    const entity = await prisma.entity.create({ data: { name: `Concurrent Entity ${suffix}` } });
    createdEntityIds.push(entity.id);
    const group = await prisma.group.create({ data: { name: `Concurrent Group ${suffix}`, entityId: entity.id } });
    createdGroupIds.push(group.id);
    const responsibility = await prisma.officialResponsibility.create({ data: { name: `Concurrent Role ${suffix}` } });
    createdResponsibilityIds.push(responsibility.id);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('api.sendgrid.com')) return new Response(null, { status: 202 });
      return originalFetch(input, init);
    }) as typeof fetch;
    try {
      const createdResponse = await fetch(`${baseUrl}/admin/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: `Concurrent target ${suffix}`,
          email: `concurrent-${suffix}@example.test`,
          entityId: entity.id,
          groupId: group.id,
          responsibilityIds: [responsibility.id],
          roles: ['RESPONSIBLE'],
        }),
      });
      expect(createdResponse.status).toBe(201);
      const created = (await createdResponse.json()) as { id: string };
      createdUserIds.push(created.id);

      let releaseMail!: () => void;
      const mailBarrier = new Promise<void>((resolve) => {
        releaseMail = resolve;
      });
      let mailRequests = 0;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('api.sendgrid.com')) {
          mailRequests += 1;
          if (mailRequests === 2) releaseMail();
          await mailBarrier;
          return new Response(null, { status: 202 });
        }
        return originalFetch(input, init);
      }) as typeof fetch;

      const resend = () =>
        fetch(`${baseUrl}/admin/users/${created.id}/invitation`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      const responses = await Promise.all([resend(), resend()]);
      expect(responses.map((response) => response.status)).toEqual([201, 201]);
      const statuses = await Promise.all(
        responses.map(async (response) => ((await response.json()) as { status: string }).status),
      );
      expect(statuses.sort()).toEqual(['SENT', 'SUPERSEDED']);
      expect(
        await prisma.accountInvitation.count({
          where: { userId: created.id, consumedAt: null, deliveryStatus: 'SENT' },
        }),
      ).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('creates an inactive account and emails a one-time activation link without returning its token', async () => {
    const entity = await prisma.entity.create({ data: { name: `Account Entity ${suffix}` } });
    createdEntityIds.push(entity.id);
    const group = await prisma.group.create({ data: { name: `Account Group ${suffix}`, entityId: entity.id } });
    createdGroupIds.push(group.id);
    const responsibility = await prisma.officialResponsibility.create({ data: { name: `Account Role ${suffix}` } });
    createdResponsibilityIds.push(responsibility.id);
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_API_KEY;
    const unavailableWithoutMail = await fetch(`${baseUrl}/admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountName: `Unsent User ${suffix}`,
        email: `unsent-${suffix}@example.test`,
        entityId: entity.id,
        groupId: group.id,
        responsibilityIds: [responsibility.id],
        roles: ['RESPONSIBLE'],
      }),
    });
    expect(unavailableWithoutMail.status).toBe(503);
    expect(await prisma.user.findUnique({ where: { emailNormalized: `unsent-${suffix}@example.test` } })).toBeNull();
    if (sendGridApiKey) process.env.SENDGRID_API_KEY = sendGridApiKey;

    let mailBody = '';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('api.sendgrid.com')) {
        mailBody = String(init?.body ?? '');
        return new Response(null, { status: 202 });
      }
      return originalFetch(input, init);
    }) as typeof fetch;
    try {
      const response = await fetch(`${baseUrl}/admin/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: `New User ${suffix}`,
          email: `  New.User-${suffix}@Example.test `,
          phone: '+261 34 00 000 02',
          entityId: entity.id,
          groupId: group.id,
          responsibilityIds: [responsibility.id],
          roles: ['RESPONSIBLE'],
        }),
      });
      expect(response.status).toBe(201);
      const payload = (await response.json()) as Record<string, unknown>;
      expect(payload).toMatchObject({
        accountName: `New User ${suffix}`,
        email: `New.User-${suffix}@Example.test`,
        phone: '+261 34 00 000 02',
        isActive: false,
        invitationPending: true,
        invitationDeliveryStatus: 'SENT',
      });
      expect(payload).not.toHaveProperty('passwordHash');
      expect(payload).not.toHaveProperty('invitationToken');
      expect(mailBody).toContain(`New.User-${suffix}@Example.test`);
      const created = await prisma.user.findUnique({ where: { emailNormalized: `new.user-${suffix}@example.test` } });
      expect(created).not.toBeNull();
      if (created) createdUserIds.push(created.id);
      expect(created?.phoneNormalized).toBe('261340000002');
      const mailPayload = JSON.parse(mailBody) as { content: Array<{ value: string }> };
      const activationLink = mailPayload.content[0]?.value.match(/https?:\/\/\S+/)?.[0];
      expect(activationLink).toBeDefined();
      const activationToken = new URLSearchParams(new URL(activationLink as string).hash.slice(1)).get('token');
      expect(activationToken).toBeTruthy();
      const persistedInvitations = await prisma.accountInvitation.findMany({
        where: { userId: created?.id },
        select: { tokenHash: true },
      });
      expect(persistedInvitations).toHaveLength(1);
      expect(persistedInvitations[0]?.tokenHash).not.toBe(activationToken);
      expect(payload).not.toHaveProperty('token');

      const prematureReactivate = await originalFetch(`${baseUrl}/admin/users/${created?.id}/active`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      expect(prematureReactivate.status).toBe(409);

      const duplicate = await originalFetch(`${baseUrl}/admin/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: `Duplicate ${suffix}`,
          email: `new.user-${suffix}@example.test`,
          entityId: entity.id,
          groupId: group.id,
          responsibilityIds: [responsibility.id],
          roles: ['RESPONSIBLE'],
        }),
      });
      expect(duplicate.status).toBe(409);

      const invalidRole = await originalFetch(`${baseUrl}/admin/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: `Invalid Role ${suffix}`,
          email: `invalid-role-${suffix}@example.test`,
          entityId: entity.id,
          groupId: group.id,
          responsibilityIds: [responsibility.id],
          roles: ['SUPERUSER'],
        }),
      });
      expect(invalidRole.status).toBe(400);

      const activation = await originalFetch(`${baseUrl}/auth/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activationToken, password: 'new-user-password' }),
      });
      expect(activation.status).toBe(204);
      expect(await prisma.user.findUnique({ where: { id: created?.id }, select: { isActive: true } })).toEqual({
        isActive: true,
      });

      const update = await originalFetch(`${baseUrl}/admin/users/${created?.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: `Updated User ${suffix}`,
          entityId: entity.id,
          groupId: group.id,
          responsibilityIds: [responsibility.id],
          roles: ['RESPONSIBLE', 'ADMINISTRATOR'],
        }),
      });
      expect(update.status).toBe(200);
      expect(await update.json()).toMatchObject({
        accountName: `Updated User ${suffix}`,
        roles: ['ADMINISTRATOR', 'RESPONSIBLE'],
        entity: { id: entity.id },
        group: { id: group.id },
        responsibilities: [{ id: responsibility.id }],
      });
      expect(
        await prisma.adminAuditEvent.count({ where: { subjectUserId: created?.id, action: 'USER_UPDATED' } }),
      ).toBe(1);

      const replay = await originalFetch(`${baseUrl}/auth/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activationToken, password: 'another-password' }),
      });
      expect(replay.status).toBe(400);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('activates the account immediately with a visible password when IS_MAILING_ACTIVE=false', async () => {
    const entity = await prisma.entity.create({ data: { name: `No Mail Entity ${suffix}` } });
    createdEntityIds.push(entity.id);
    const group = await prisma.group.create({ data: { name: `No Mail Group ${suffix}`, entityId: entity.id } });
    createdGroupIds.push(group.id);
    const responsibility = await prisma.officialResponsibility.create({ data: { name: `No Mail Role ${suffix}` } });
    createdResponsibilityIds.push(responsibility.id);
    const previousIsMailingActive = process.env.IS_MAILING_ACTIVE;
    const previousSendGridApiKey = process.env.SENDGRID_API_KEY;
    process.env.IS_MAILING_ACTIVE = 'false';
    delete process.env.SENDGRID_API_KEY;
    const email = `no-mail-${suffix}@example.test`;
    try {
      const response = await fetch(`${baseUrl}/admin/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: `No Mail User ${suffix}`,
          email,
          entityId: entity.id,
          groupId: group.id,
          responsibilityIds: [responsibility.id],
          roles: ['RESPONSIBLE'],
        }),
      });
      expect(response.status).toBe(201);
      const payload = (await response.json()) as Record<string, unknown>;
      expect(payload).toMatchObject({
        accountName: `No Mail User ${suffix}`,
        isActive: true,
        invitationPending: false,
      });
      expect(typeof payload.initialPassword).toBe('string');
      expect((payload.initialPassword as string).length).toBeGreaterThan(10);
      const created = await prisma.user.findUnique({ where: { emailNormalized: email } });
      expect(created).not.toBeNull();
      if (created) createdUserIds.push(created.id);
      expect(created?.activatedAt).not.toBeNull();
      expect(await prisma.accountInvitation.count({ where: { userId: created?.id } })).toBe(0);

      const login = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password: payload.initialPassword }),
      });
      expect(login.status).toBe(200);
    } finally {
      restoreEnvironment('IS_MAILING_ACTIVE', previousIsMailingActive);
      restoreEnvironment('SENDGRID_API_KEY', previousSendGridApiKey);
    }
  });

  it('revokes existing sessions when an administrator deactivates an account', async () => {
    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: `target-${suffix}@example.test`, password: 'responsible-password' }),
    });
    const responsibleToken = ((await login.json()) as { accessToken: string }).accessToken;
    const update = await fetch(`${baseUrl}/admin/users/${targetId}/active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    });
    expect(update.status).toBe(200);
    expect(await update.json()).toMatchObject({ id: targetId, isActive: false });

    const me = await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${responsibleToken}` } });
    expect(me.status).toBe(401);
    expect(await prisma.adminAuditEvent.count({ where: { subjectUserId: targetId, action: 'USER_DEACTIVATED' } })).toBe(
      1,
    );

    const reactivate = await fetch(`${baseUrl}/admin/users/${targetId}/active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    });
    expect(reactivate.status).toBe(200);
    expect(await reactivate.json()).toMatchObject({ id: targetId, isActive: true });
    const relogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: `target-${suffix}@example.test`, password: 'responsible-password' }),
    });
    expect(relogin.status).toBe(200);
    expect(await prisma.adminAuditEvent.count({ where: { subjectUserId: targetId, action: 'USER_REACTIVATED' } })).toBe(
      1,
    );
  });
});

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
