import { isEmail } from 'class-validator';

type DemoSeedEnvironment = { NODE_ENV?: string; APP_ENV?: string; DATABASE_URL?: string } & Record<
  string,
  string | undefined
>;

export function getDemoAdminCredentials(
  env: DemoSeedEnvironment,
): { email: string; password: string } | undefined {
  const email = env.DEMO_ADMIN_EMAIL?.trim() ?? '';
  const password = env.DEMO_ADMIN_PASSWORD;
  const hasEmail = email.length > 0;
  const hasPassword = password !== undefined && password.length > 0;

  if (!hasEmail && !hasPassword) return undefined;
  if (!hasEmail || !hasPassword) {
    throw new Error('DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD must be set together.');
  }
  if (!isEmail(email)) {
    throw new Error('DEMO_ADMIN_EMAIL must be a valid email address.');
  }
  if (email.toLowerCase() === 'demo@fivondronana.test') {
    throw new Error('DEMO_ADMIN_EMAIL must not be the demo responsible account.');
  }

  return { email, password };
}

export function assertDemoSeedAllowed(env: DemoSeedEnvironment): void {
  if (env.NODE_ENV === 'production' || env.APP_ENV === 'production') {
    throw new Error('The demo account seed is disabled in production.');
  }
  if (env.APP_ENV !== 'development') {
    throw new Error('The demo account seed is allowed only when APP_ENV=development.');
  }
}

export function requireDemoDatabaseUrl(env: DemoSeedEnvironment): string {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL must be set before creating the demo account.');
  return env.DATABASE_URL;
}
