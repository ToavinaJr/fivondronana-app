export function createIntegrationEnv(baseEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const connectionString = baseEnv.DATABASE_URL_TEST;
  if (!connectionString) {
    throw new Error('DATABASE_URL_TEST doit pointer vers une base PostgreSQL de test dédiée.');
  }

  let databaseName: string;
  try {
    const url = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  } catch {
    throw new Error('DATABASE_URL_TEST doit être une URL PostgreSQL valide.');
  }

  if (!databaseName.toLowerCase().endsWith('_test')) {
    throw new Error('Refus de migrer : le nom de la base DATABASE_URL_TEST doit se terminer par _test.');
  }

  return { ...baseEnv, DATABASE_URL: connectionString, NODE_ENV: 'test' };
}
