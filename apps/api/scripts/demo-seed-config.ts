type DemoSeedEnvironment = { NODE_ENV?: string; APP_ENV?: string; DATABASE_URL?: string } & Record<
  string,
  string | undefined
>;

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
