import { describe, expect, it, mock } from 'bun:test';
import { ensureDemoAdministrator } from '../scripts/demo-admin-seed.js';
import { verifyPassword } from '../src/modules/auth/auth.crypto.js';

const credentials = { email: 'Admin@Fivondronana.test', password: 'private admin password' };

describe('demo administrator seed', () => {
  it('creates an active administrator with a verifiable password hash when the email is unused', async () => {
    const findByEmailNormalized = mock(async (_email: string) => null);
    const create = mock(
      async (_input: {
        accountName: string;
        email: string;
        emailNormalized: string;
        passwordHash: string;
        isActive: true;
        activatedAt: Date;
        role: 'ADMINISTRATOR';
      }) => {},
    );

    await ensureDemoAdministrator({ findByEmailNormalized, create }, credentials);

    expect(findByEmailNormalized).toHaveBeenCalledWith('admin@fivondronana.test');
    expect(create).toHaveBeenCalledTimes(1);
    const created = create.mock.calls[0]?.[0];
    expect(created).toMatchObject({
      accountName: 'Administrateur d\u00e9mo',
      email: 'Admin@Fivondronana.test',
      emailNormalized: 'admin@fivondronana.test',
      isActive: true,
      role: 'ADMINISTRATOR',
    });
    expect(created?.activatedAt).toBeInstanceOf(Date);
    expect(await verifyPassword(credentials.password, created?.passwordHash ?? '')).toBe(true);
  });

  it('does not reset an existing administrator account', async () => {
    const findByEmailNormalized = mock(async (_email: string) => ({ id: 'admin-1', roles: ['ADMINISTRATOR'] }));
    const create = mock(async (_input: never) => {});

    await ensureDemoAdministrator({ findByEmailNormalized, create }, credentials);

    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an existing non-administrator email without modifying that account', async () => {
    const findByEmailNormalized = mock(async (_email: string) => ({ id: 'user-1', roles: ['RESPONSIBLE'] }));
    const create = mock(async (_input: never) => {});

    await expect(ensureDemoAdministrator({ findByEmailNormalized, create }, credentials)).rejects.toThrow(
      'DEMO_ADMIN_EMAIL is already used by a non-administrator account.',
    );
    expect(create).not.toHaveBeenCalled();
  });
});
