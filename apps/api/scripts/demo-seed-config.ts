type DemoSeedEnvironment = Pick<NodeJS.ProcessEnv, 'NODE_ENV' | 'APP_ENV' | 'DATABASE_URL'>;

export function assertDemoSeedAllowed(env: DemoSeedEnvironment): void {
  if (env.NODE_ENV === 'production' || env.APP_ENV === 'production') {
    throw new Error('The demo account seed is disabled in production.');
  }
}

export function requireDemoDatabaseUrl(env: DemoSeedEnvironment): string {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL must be set before creating the demo account.');
  return env.DATABASE_URL;
}
