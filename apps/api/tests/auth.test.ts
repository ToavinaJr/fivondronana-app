import { describe, expect, mock, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { hashPassword, issueAccessToken, verifyAccessToken, verifyPassword } from '../src/modules/auth/auth.crypto.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

const secret = 'this-is-a-test-signing-secret-at-least-32-chars';

describe('authentication', () => {
  test('stores passwords as salted hashes and verifies them', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).not.toContain('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
    expect(await verifyPassword('wrong password', hash)).toBe(false);
  });

  test('issues a signed access token and rejects tampering', async () => {
    const prisma = createPrisma({
      id: 'user-1',
      accountName: 'Toavina',
      email: 'scout@example.org',
      emailNormalized: 'scout@example.org',
      phone: null,
      phoneNormalized: null,
      passwordHash: await hashPassword('password123'),
      isActive: true,
    });
    const auth = new AuthService(prisma as never, secret);
    const result = await auth.login(' SCOUT@example.org ', 'password123');
    expect(result.tokenType).toBe('Bearer');
    expect(result.user.id).toBe('user-1');
    expect(verifyAccessToken(result.accessToken, secret).sub).toBe('user-1');
    const tampered = `${result.accessToken.slice(0, -1)}x`;
    expect(() => verifyAccessToken(tampered, secret)).toThrow();
  });

  test('issues distinct access tokens even when refreshed within the same second', () => {
    const now = 1_000_000;
    const first = issueAccessToken('user-1', 'session-1', secret, now).token;
    const second = issueAccessToken('user-1', 'session-1', secret, now).token;

    expect(second).not.toBe(first);
    expect(verifyAccessToken(first, secret, now)).toMatchObject({ sub: 'user-1', sid: 'session-1' });
    expect(verifyAccessToken(second, secret, now)).toMatchObject({ sub: 'user-1', sid: 'session-1' });
  });

  test('rejects a non-canonical Base64URL signature with equivalent trailing bits', () => {
    const token = issueAccessToken('user-1', 'session-1', secret).token;
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) throw new Error('Issued access token has an invalid structure.');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const finalCharacter = signature.at(-1);
    if (!finalCharacter) throw new Error('Issued signature is empty.');
    const finalCharacterIndex = alphabet.indexOf(finalCharacter);
    const equivalentIndex = (finalCharacterIndex & 0b110000) | ((finalCharacterIndex + 1) & 0b001111);
    const alternateCharacter = alphabet[equivalentIndex];
    if (!alternateCharacter) throw new Error('Could not build an equivalent Base64URL character.');
    const alternateSignature = `${signature.slice(0, -1)}${alternateCharacter}`;

    expect(() => verifyAccessToken(`${header}.${payload}.${alternateSignature}`, secret)).toThrow(
      'Invalid access token signature.',
    );
  });

  test('rejects an expired access token', () => {
    const token = issueAccessToken('user-1', 'session-1', secret, 1_000).token;
    expect(() => verifyAccessToken(token, secret, 1_000 + 15 * 60 * 1_000)).toThrow('Expired or invalid access token.');
  });

  test('accepts a phone identifier and normalizes the stored comparison', async () => {
    const user = {
      id: 'user-2',
      accountName: 'Mamy',
      email: null,
      emailNormalized: null,
      phone: '+261 34 12 345 67',
      phoneNormalized: '261341234567',
      passwordHash: await hashPassword('password123'),
      isActive: true,
    };
    const prisma = createPrisma(user);
    const auth = new AuthService(prisma as never, secret);
    const result = await auth.login('+261-34-12-345-67', 'password123');
    expect(result.user.id).toBe('user-2');
    expect(result.user.phone).toBe('+261 34 12 345 67');
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { phoneNormalized: '261341234567' },
      include: { roles: { select: { role: true } } },
    });
  });

  test('reports isResponsible based on the account’s roles', async () => {
    const passwordHash = await hashPassword('password123');
    const findFirst = mock(async () => ({
      id: 'user-resp',
      accountName: 'Tiana',
      email: 'tiana@example.org',
      emailNormalized: 'tiana@example.org',
      phone: null,
      phoneNormalized: null,
      passwordHash,
      isActive: true,
      roles: [{ role: 'ENTITY_MANAGER' }],
    }));
    const auth = new AuthService({ user: { findFirst }, authSession: { create: mock(async () => ({})) } } as never, secret);
    const result = await auth.login('tiana@example.org', 'password123');
    expect(result.user.isResponsible).toBe(true);

    findFirst.mockImplementationOnce(async () => ({
      id: 'user-plain',
      accountName: 'Mamy',
      email: 'mamy@example.org',
      emailNormalized: 'mamy@example.org',
      phone: null,
      phoneNormalized: null,
      passwordHash,
      isActive: true,
      roles: [],
    }));
    const plain = await auth.login('mamy@example.org', 'password123');
    expect(plain.user.isResponsible).toBe(false);
  });

  test('rejects wrong passwords and inactive accounts with the same response', async () => {
    const hash = await hashPassword('password123');
    const active = new AuthService(
      createPrisma({
        id: 'active',
        accountName: 'A',
        email: 'a@example.org',
        emailNormalized: 'a@example.org',
        phone: null,
        phoneNormalized: null,
        passwordHash: hash,
        isActive: true,
      }) as never,
      secret,
    );
    const inactive = new AuthService(
      createPrisma({
        id: 'inactive',
        accountName: 'I',
        email: 'i@example.org',
        emailNormalized: 'i@example.org',
        phone: null,
        phoneNormalized: null,
        passwordHash: hash,
        isActive: false,
      }) as never,
      secret,
    );
    await expect(active.login('a@example.org', 'wrong-pass')).rejects.toThrow(
      'Identifiants invalides ou compte désactivé.',
    );
    await expect(inactive.login('i@example.org', 'password123')).rejects.toThrow(
      'Identifiants invalides ou compte désactivé.',
    );
  });

  test('normalizes email lookup and creates a revocable server session', async () => {
    const user = {
      id: 'user-3',
      accountName: 'Solo',
      email: 'solo@example.org',
      emailNormalized: 'solo@example.org',
      phone: null,
      phoneNormalized: null,
      passwordHash: await hashPassword('password123'),
      isActive: true,
    };
    const prisma = createPrisma(user);
    const auth = new AuthService(prisma as never, secret);
    await auth.login(' SOLO@example.org ', 'password123');
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { emailNormalized: 'solo@example.org' },
      include: { roles: { select: { role: true } } },
    });
    expect(prisma.authSession.create).toHaveBeenCalled();
  });

  test('issues a long-lived refresh token only when the responsible selects remember me', async () => {
    const user = {
      id: 'user-remember',
      accountName: 'Solo',
      email: 'solo@example.org',
      emailNormalized: 'solo@example.org',
      phone: null,
      phoneNormalized: null,
      passwordHash: await hashPassword('password123'),
      isActive: true,
    };
    const prisma = createPrisma(user);
    const result = await new AuthService(prisma as never, secret).login('solo@example.org', 'password123', true);

    expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(result.expiresIn).toBe(15 * 60);
    expect(result.refreshExpiresIn).toBe(30 * 24 * 60 * 60);
    expect(prisma.authSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-remember',
        refreshTokenHash: createHash('sha256').update(result.refreshToken).digest('hex'),
        expiresAt: expect.any(Date),
      }),
    });
    expect(result).not.toHaveProperty('rememberMe');
  });

  test('rotates a refresh token once and refuses replay', async () => {
    const currentHash = createHash('sha256').update('refresh-token-current').digest('hex');
    let persistedHash = currentHash;
    const session = {
      id: 'session-refresh',
      userId: 'user-refresh',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      refreshTokenHash: currentHash,
      user: {
        id: 'user-refresh',
        accountName: 'Tiana',
        email: 'tiana@example.org',
        phone: null,
        isActive: true,
        roles: [],
      },
    };
    const prisma = {
      authSession: {
        findFirst: mock(async ({ where }: { where: { refreshTokenHash: string } }) =>
          where.refreshTokenHash === persistedHash ? session : null,
        ),
        updateMany: mock(
          async ({ where, data }: { where: { refreshTokenHash: string }; data: { refreshTokenHash: string } }) => {
            if (where.refreshTokenHash !== persistedHash) return { count: 0 };
            persistedHash = data.refreshTokenHash;
            return { count: 1 };
          },
        ),
      },
    };
    const auth = new AuthService(prisma as never, secret);

    const rotated = await auth.refresh('refresh-token-current');
    expect(rotated.accessToken).toBeTruthy();
    expect(rotated.refreshToken).not.toBe('refresh-token-current');
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-refresh',
        refreshTokenHash: currentHash,
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { refreshTokenHash: expect.any(String) },
    });
    await expect(auth.refresh('refresh-token-current')).rejects.toThrow();
  });

  test('changes the password only after verifying the current one and revokes every session', async () => {
    const user = {
      id: 'user-4',
      accountName: 'Tiana',
      email: 'tiana@example.org',
      emailNormalized: 'tiana@example.org',
      phone: null,
      phoneNormalized: null,
      passwordHash: await hashPassword('oldPassword1'),
      isActive: true,
    };
    const update = mock(async () => ({}));
    const updateMany = mock(async () => ({ count: 2 }));
    const prisma = {
      user: { findUnique: async () => user, update },
      authSession: { updateMany },
      $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
    };
    const auth = new AuthService(prisma as never, secret);
    await expect(auth.changePassword(user.id, 'wrongPassword', 'newPassword1')).rejects.toThrow(
      'Le mot de passe actuel est incorrect.',
    );
    await auth.changePassword(user.id, 'oldPassword1', 'newPassword1');
    expect(update).toHaveBeenCalledWith({ where: { id: user.id }, data: { passwordHash: expect.any(String) } });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

function createPrisma(user: {
  id: string;
  accountName: string;
  email: string | null;
  emailNormalized?: string | null;
  phone: string | null;
  phoneNormalized?: string | null;
  passwordHash: string;
  isActive: boolean;
}) {
  const findFirst = mock(async ({ where }: { where: { emailNormalized?: string; phoneNormalized?: string } }) => {
    const found =
      (where.emailNormalized && user.emailNormalized === where.emailNormalized) ||
      (where.phoneNormalized && user.phoneNormalized === where.phoneNormalized);
    return found ? { ...user, roles: [] } : null;
  });
  return {
    user: { findFirst },
    authSession: { create: mock(async () => ({})) },
  };
}
