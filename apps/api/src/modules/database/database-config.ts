export function requireDatabaseUrl(env: Readonly<{ DATABASE_URL?: string }>): string {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL must be set before starting the API.');
  return env.DATABASE_URL;
}
