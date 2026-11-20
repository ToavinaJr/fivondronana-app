import { describe, expect, mock, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { AuthService } from '../../src/modules/auth/auth.service.js';

const secret = 'password-recovery-test-secret-with-more-than-32-characters';

describe('password recovery', () => {
  test('sends a reset link for an active account and stores only the token hash', async () => {
    let storedTokenHash = '';
    let deliveredToken = '';
    const user = { id: 'user-1', accountName: 'Tiana', email: 'tiana@example.org', isActive: true };
    const prisma = {
      user: { findUnique: mock(async () => user) },
      passwordResetToken: {
        count: mock(async () => 0),
        create: mock(async ({ data }: { data: { tokenHash: string } }) => {
          storedTokenHash = data.tokenHash;
          return {};
        }),
      },
    };
    const mailer = {
      sendPasswordReset: mock(async (_email: string, _name: string, token: string) => {
        deliveredToken = token;
      }),
    };
    const auth = new AuthService(prisma as never, secret, mailer as never);

    await expect(auth.requestPasswordReset(' Tiana@Example.org ')).resolves.toBeUndefined();

    expect(deliveredToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(storedTokenHash).toBe(createHash('sha256').update(deliveredToken).digest('hex'));
    expect(storedTokenHash).not.toBe(deliveredToken);
    expect(mailer.sendPasswordReset).toHaveBeenCalledWith('tiana@example.org', 'Tiana', deliveredToken);
  });

  test('returns the same result for unknown, inactive, and active accounts', async () => {
    const sendPasswordReset = mock(async () => {});
    const userStates = [null, { id: 'inactive', accountName: 'Inactive', email: 'i@example.org', isActive: false }];
    const prisma = {
      user: { findUnique: mock(async () => userStates.shift() ?? null) },
      passwordResetToken: { count: mock(async () => 0), create: mock(async () => ({})) },
    };
    const auth = new AuthService(prisma as never, secret, { sendPasswordReset } as never);

    await expect(auth.requestPasswordReset('unknown@example.org')).resolves.toBeUndefined();
    await expect(auth.requestPasswordReset('inactive@example.org')).resolves.toBeUndefined();
    expect(sendPasswordReset).not.toHaveBeenCalled();
  });

  test('changes the password atomically and revokes all active sessions', async () => {
    const token = 'one-time-password-reset-token-value';
    const tokenHash = createHash('sha256').update(token).digest('hex');
    let consumed = false;
    let passwordChanged = false;
    let sessionsRevoked = false;
    const prisma = {
      passwordResetToken: {
        findUnique: mock(async () =>
          consumed
            ? null
            : { id: 'reset-1', userId: 'user-1', expiresAt: new Date(Date.now() + 60_000), consumedAt: null },
        ),
      },
      $transaction: async (operation: (tx: unknown) => Promise<void>) =>
        operation({
          passwordResetToken: {
            updateMany: async ({ where }: { where: { tokenHash: string } }) => {
              if (where.tokenHash !== tokenHash || consumed) return { count: 0 };
              consumed = true;
              return { count: 1 };
            },
          },
          user: {
            update: async () => {
              passwordChanged = true;
            },
          },
          authSession: {
            updateMany: async () => {
              sessionsRevoked = true;
              return { count: 2 };
            },
          },
        }),
    };
    const auth = new AuthService(prisma as never, secret);

    await auth.completePasswordReset(token, 'new-password-123');
    expect(passwordChanged).toBe(true);
    expect(sessionsRevoked).toBe(true);
    await expect(auth.completePasswordReset(token, 'another-password-123')).rejects.toThrow();
  });

  test('rejects short replacement passwords before touching a reset token', async () => {
    const prisma = { passwordResetToken: { findUnique: mock(async () => null) } };
    const auth = new AuthService(prisma as never, secret);
    await expect(auth.completePasswordReset('token-value', 'short')).rejects.toThrow();
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });
});
