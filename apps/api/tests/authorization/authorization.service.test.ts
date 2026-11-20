import { describe, expect, it, mock } from 'bun:test';
import 'reflect-metadata';
import { AuthorizationService } from '../../src/modules/authorization/authorization.service.js';
import { Permission } from '../../src/modules/authorization/permissions.js';
import { UserRole } from '../../src/modules/authorization/roles.js';
import { PrismaService } from '../../src/modules/database/prisma.service.js';

function createPrisma(user: unknown) {
  return { user: { findUnique: mock(async () => user) } };
}

const activeMembership = {
  entityId: 'entity-a',
  entity: { isActive: true },
  group: { isActive: true },
};

describe('authorization service', () => {
  it('exposes PrismaService as the runtime Nest injection token', () => {
    expect(Reflect.getMetadata('design:paramtypes', AuthorizationService)).toEqual([PrismaService]);
  });

  it('grants administrator operations only to administrator role', async () => {
    const prisma = createPrisma({ isActive: true, roles: [{ role: UserRole.ADMINISTRATOR }], membership: null });
    const authorization = new AuthorizationService(prisma as never);
    expect(await authorization.hasPermission('admin-1', Permission.USERS_MANAGE)).toBe(true);
    expect(await authorization.hasPermission('admin-1', Permission.CV_READ_ANY)).toBe(false);
  });

  it('allows an account to hold both admin and responsible permissions', async () => {
    const prisma = createPrisma({
      isActive: true,
      roles: [{ role: UserRole.ADMINISTRATOR }, { role: UserRole.RESPONSIBLE }],
      membership: activeMembership,
    });
    const authorization = new AuthorizationService(prisma as never);
    expect(await authorization.hasPermission('dual-role', Permission.USERS_MANAGE)).toBe(true);
    expect(await authorization.hasPermission('dual-role', Permission.CV_READ_ANY)).toBe(true);
    expect(await authorization.hasPermission('dual-role', Permission.CV_WRITE_OWN, { ownerId: 'dual-role' })).toBe(
      true,
    );
    expect(await authorization.hasPermission('dual-role', Permission.CV_WRITE_OWN, { ownerId: 'other-user' })).toBe(
      false,
    );
  });

  it('scopes entity permissions to the single active membership', async () => {
    const prisma = createPrisma({
      isActive: true,
      roles: [{ role: UserRole.ENTITY_MANAGER }],
      membership: activeMembership,
    });
    const authorization = new AuthorizationService(prisma as never);
    expect(
      await authorization.hasPermission('entity-manager', Permission.ENTITY_CONVERSATION_READ, {
        entityId: 'entity-a',
      }),
    ).toBe(true);
    expect(
      await authorization.hasPermission('entity-manager', Permission.ENTITY_CONVERSATION_READ, {
        entityId: 'entity-b',
      }),
    ).toBe(false);
    expect(await authorization.hasPermission('entity-manager', Permission.ENTITY_CONVERSATION_READ)).toBe(false);
  });

  it('allows responsible roles into the general conversation without granting admin powers', async () => {
    const prisma = createPrisma({
      isActive: true,
      roles: [{ role: UserRole.GENERAL_MANAGER }],
      membership: activeMembership,
    });
    const authorization = new AuthorizationService(prisma as never);
    expect(await authorization.hasPermission('general-manager', Permission.GENERAL_CONVERSATION)).toBe(true);
    expect(await authorization.hasPermission('general-manager', Permission.USERS_MANAGE)).toBe(false);
  });

  it('does not authorize entity-scoped use when the entity or group is inactive', async () => {
    const prisma = createPrisma({
      isActive: true,
      roles: [{ role: UserRole.ENTITY_MANAGER }],
      membership: { ...activeMembership, group: { isActive: false } },
    });
    const authorization = new AuthorizationService(prisma as never);
    expect(
      await authorization.hasPermission('inactive-member', Permission.ENTITY_CONVERSATION_READ, {
        entityId: 'entity-a',
      }),
    ).toBe(false);
  });

  it('grants contact reading to responsibles and contact management only to administrators', async () => {
    const responsible = new AuthorizationService(
      createPrisma({ isActive: true, roles: [{ role: UserRole.RESPONSIBLE }], membership: activeMembership }) as never,
    );
    expect(await responsible.hasPermission('responsible-1', Permission.CONTACTS_READ)).toBe(true);
    expect(await responsible.hasPermission('responsible-1', Permission.CONTACTS_MANAGE)).toBe(false);

    const admin = new AuthorizationService(
      createPrisma({ isActive: true, roles: [{ role: UserRole.ADMINISTRATOR }], membership: null }) as never,
    );
    expect(await admin.hasPermission('admin-1', Permission.CONTACTS_MANAGE)).toBe(true);
    expect(await admin.hasPermission('admin-1', Permission.CONTACTS_READ)).toBe(false);
  });

  it('grants conversation management only to administrators', async () => {
    const responsible = new AuthorizationService(
      createPrisma({ isActive: true, roles: [{ role: UserRole.RESPONSIBLE }], membership: activeMembership }) as never,
    );
    expect(await responsible.hasPermission('responsible-1', Permission.CONVERSATIONS_MANAGE)).toBe(false);

    const admin = new AuthorizationService(
      createPrisma({ isActive: true, roles: [{ role: UserRole.ADMINISTRATOR }], membership: null }) as never,
    );
    expect(await admin.hasPermission('admin-1', Permission.CONVERSATIONS_MANAGE)).toBe(true);
  });

  it('denies unknown users and general permissions to ordinary accounts', async () => {
    const prisma = createPrisma(null);
    const authorization = new AuthorizationService(prisma as never);
    expect(await authorization.hasPermission('missing', Permission.USERS_MANAGE)).toBe(false);
    expect(await authorization.hasPermission('missing', Permission.GENERAL_CONVERSATION)).toBe(false);
  });
});
