type DemoSeedEnvironment = {
  NODE_ENV?: string;
  APP_ENV?: string;
  DATABASE_URL?: string;
  DEMO_ADMIN_EMAIL?: string;
  DEMO_ADMIN_PASSWORD?: string;
} & Record<string, string | undefined>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function getDemoAdminCredentials(env: DemoSeedEnvironment): { email: string; password: string } | undefined {
  const email = env.DEMO_ADMIN_EMAIL?.trim();
  const password = env.DEMO_ADMIN_PASSWORD;
  if (!email && !password) return undefined;
  if (!email || !password) {
    throw new Error('DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD must both be set to seed a development administrator.');
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('DEMO_ADMIN_EMAIL must be a valid email address.');
  }
  return { email, password };
}
