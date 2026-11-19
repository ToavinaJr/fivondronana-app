export function requireDatabaseUrl(
  env: Readonly<{ DATABASE_URL?: string } & Record<string, string | undefined>>,
): string {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL must be set before starting the API.');
  try {
    const url = new URL(env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2 || url.hash) {
      throw new Error('Invalid database URL');
    }
  } catch {
    // Never include a connection string (and its credentials) in an error.
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL with a database name.');
  }
  return env.DATABASE_URL;
}
