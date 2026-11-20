import { hashPassword } from '../src/modules/auth/auth.crypto.js';

export type DemoAdminCredentials = { email: string; password: string };

type DemoAdminUser = { roles: readonly string[] };

type DemoAdminCreateInput = {
  accountName: string;
  email: string;
  emailNormalized: string;
  passwordHash: string;
  isActive: true;
  activatedAt: Date;
  role: 'ADMINISTRATOR';
};

export type DemoAdminStore = {
  findByEmailNormalized(emailNormalized: string): Promise<DemoAdminUser | null>;
  create(input: DemoAdminCreateInput): Promise<void>;
};

export async function ensureDemoAdministrator(
  store: DemoAdminStore,
  credentials: DemoAdminCredentials,
): Promise<void> {
  const emailNormalized = credentials.email.trim().toLowerCase();
  const existing = await store.findByEmailNormalized(emailNormalized);

  if (existing) {
    if (existing.roles.includes('ADMINISTRATOR')) return;
    throw new Error('DEMO_ADMIN_EMAIL is already used by a non-administrator account.');
  }

  await store.create({
    accountName: 'Administrateur d\u00e9mo',
    email: credentials.email,
    emailNormalized,
    passwordHash: await hashPassword(credentials.password),
    isActive: true,
    activatedAt: new Date(),
    role: 'ADMINISTRATOR',
  });
}
