import { describe, expect, mock, test } from 'bun:test';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword, issueAccessToken, verifyPassword, verifyAccessToken } from '../src/modules/auth/auth.crypto.js';

const secret = 'this-is-a-test-signing-secret-at-least-32-chars';

describe('authentication', () => {
  test('stores passwords as salted hashes and verifies them', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).not.toContain('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
    expect(await verifyPassword('wrong password', hash)).toBe(false);
  });

  test('issues a signed access token and rejects tampering', async () => {
    const prisma = createPrisma({ id: 'user-1', accountName: 'Toavina', email: 'scout@example.org', emailNormalized: 'scout@example.org', phone: null, phoneNormalized: null, passwordHash: await hashPassword('password123'), isActive: true });
    const auth = new AuthService(prisma as never, secret);
    const result = await auth.login(' SCOUT@example.org ', 'password123');
    expect(result.tokenType).toBe('Bearer');
    expect(result.user.id).toBe('user-1');
    expect(verifyAccessToken(result.accessToken, secret).sub).toBe('user-1');
    const tampered = `${result.accessToken.slice(0, -1)}x`;
    expect(() => verifyAccessToken(tampered, secret)).toThrow();
  });

  test('rejects an expired access token', () => {
    const token = issueAccessToken('user-1', 'session-1', secret, 1_000).token;
    expect(() => verifyAccessToken(token, secret, 1_000 + 15 * 60 * 1_000)).toThrow('Expired or invalid access token.');
  });

  test('accepts a phone identifier and normalizes the stored comparison', async () => {
    const user = { id: 'user-2', accountName: 'Mamy', email: null, emailNormalized: null, phone: '+261 34 12 345 67', phoneNormalized: '261341234567', passwordHash: await hashPassword('password123'), isActive: true };
    const prisma = createPrisma(user);
    const auth = new AuthService(prisma as never, secret);
    const result = await auth.login('+261-34-12-345-67', 'password123');
    expect(result.user.id).toBe('user-2');
    expect(result.user.phone).toBe('+261 34 12 345 67');
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { phoneNormalized: '261341234567' } });
  });

  test('rejects wrong passwords and inactive accounts with the same response', async () => {
    const hash = await hashPassword('password123');
    const active = new AuthService(createPrisma({ id: 'active', accountName: 'A', email: 'a@example.org', emailNormalized: 'a@example.org', phone: null, phoneNormalized: null, passwordHash: hash, isActive: true }) as never, secret);
    const inactive = new AuthService(createPrisma({ id: 'inactive', accountName: 'I', email: 'i@example.org', emailNormalized: 'i@example.org', phone: null, phoneNormalized: null, passwordHash: hash, isActive: false }) as never, secret);
    await expect(active.login('a@example.org', 'wrong-pass')).rejects.toThrow('Identifiants invalides ou compte désactivé.');
    await expect(inactive.login('i@example.org', 'password123')).rejects.toThrow('Identifiants invalides ou compte désactivé.');
  });

  test('normalizes email lookup and creates a revocable server session', async () => {
    const user = { id: 'user-3', accountName: 'Solo', email: 'solo@example.org', emailNormalized: 'solo@example.org', phone: null, phoneNormalized: null, passwordHash: await hashPassword('password123'), isActive: true };
    const prisma = createPrisma(user);
    const auth = new AuthService(prisma as never, secret);
    await auth.login(' SOLO@example.org ', 'password123');
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { emailNormalized: 'solo@example.org' } });
    expect(prisma.authSession.create).toHaveBeenCalled();
  });

  test('changes the password only after verifying the current one and revokes every session', async () => {
    const user = { id: 'user-4', accountName: 'Tiana', email: 'tiana@example.org', emailNormalized: 'tiana@example.org', phone: null, phoneNormalized: null, passwordHash: await hashPassword('oldPassword1'), isActive: true };
    const update = mock(async () => ({}));
    const updateMany = mock(async () => ({ count: 2 }));
    const prisma = {
      user: { findUnique: async () => user, update },
      authSession: { updateMany },
      $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
    };
    const auth = new AuthService(prisma as never, secret);
    await expect(auth.changePassword(user.id, 'wrongPassword', 'newPassword1')).rejects.toThrow('Le mot de passe actuel est incorrect.');
    await auth.changePassword(user.id, 'oldPassword1', 'newPassword1');
    expect(update).toHaveBeenCalledWith({ where: { id: user.id }, data: { passwordHash: expect.any(String) } });
    expect(updateMany).toHaveBeenCalledWith({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });
});

function createPrisma(user: { id: string; accountName: string; email: string | null; emailNormalized?: string | null; phone: string | null; phoneNormalized?: string | null; passwordHash: string; isActive: boolean }) {
  const findFirst = mock(async ({ where }: { where: { emailNormalized?: string; phoneNormalized?: string } }) => {
    const found = (where.emailNormalized && user.emailNormalized === where.emailNormalized) || (where.phoneNormalized && user.phoneNormalized === where.phoneNormalized);
    return found ? user : null;
  });
  return {
    user: { findFirst },
    authSession: { create: mock(async () => ({})) },
  };
}

