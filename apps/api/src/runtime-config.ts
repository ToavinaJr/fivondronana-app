import { getAllowedOrigins, getPositiveInteger } from './http-security.js';
import { validateJwtSecret } from './modules/auth/auth.crypto.js';
import { requireDatabaseUrl } from './modules/database/database-config.js';

export function validateRuntimeEnvironment(env: NodeJS.ProcessEnv): { port: number } {
  const appEnv = env.APP_ENV ?? env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'staging', 'production'].includes(appEnv)) {
    throw new Error('APP_ENV must be development, test, staging or production.');
  }
  if (env.NODE_ENV && !['development', 'test', 'production'].includes(env.NODE_ENV)) {
    throw new Error('NODE_ENV must be development, test or production.');
  }
  if (['staging', 'production'].includes(appEnv) && env.NODE_ENV !== 'production') {
    throw new Error('NODE_ENV must be production for staging/production APP_ENV.');
  }
  if (env.NODE_ENV === 'production' && !['staging', 'production'].includes(appEnv)) {
    throw new Error('APP_ENV must be staging or production when NODE_ENV is production.');
  }
  requireDatabaseUrl(env);
  validateJwtSecret(env.JWT_SECRET);
  getAllowedOrigins(env);
  const port = getPositiveInteger(env.API_PORT, 3000, 'API_PORT');
  if (port > 65535) throw new Error('API_PORT must be between 1 and 65535.');
  getPositiveInteger(env.AUTH_RATE_LIMIT, 10, 'AUTH_RATE_LIMIT');
  getPositiveInteger(env.AUTH_RATE_WINDOW_SECONDS, 60, 'AUTH_RATE_WINDOW_SECONDS');
  return { port };
}
