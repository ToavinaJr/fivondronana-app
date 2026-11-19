import { describe, expect, it } from 'bun:test';
import { createIntegrationEnv } from '../../../scripts/integration-config.js';
import { assertDemoSeedAllowed, requireDemoDatabaseUrl } from '../scripts/demo-seed-config.js';
import { requireDatabaseUrl } from '../src/modules/database/database-config.js';

describe('integration environment safety', () => {
  it('requires a PostgreSQL test URL whose database name ends in _test', () => {
    expect(() => createIntegrationEnv({})).toThrow(
      'DATABASE_URL_TEST doit pointer vers une base PostgreSQL de test dédiée.',
    );
    expect(() => createIntegrationEnv({ DATABASE_URL_TEST: 'mysql://localhost/fivondronana_test' })).toThrow(
      'DATABASE_URL_TEST doit être une URL PostgreSQL valide.',
    );
    expect(() => createIntegrationEnv({ DATABASE_URL_TEST: 'postgresql://localhost/fivondronana' })).toThrow(
      'le nom de la base DATABASE_URL_TEST doit se terminer par _test',
    );
    expect(() => createIntegrationEnv({ DATABASE_URL_TEST: 'postgresql://localhost/fivondronana_test_extra' })).toThrow(
      'le nom de la base DATABASE_URL_TEST doit se terminer par _test',
    );
  });

  it('forces the child process to use the validated test URL and environment', () => {
    const env = createIntegrationEnv({
      DATABASE_URL: 'postgresql://localhost/fivondronana',
      DATABASE_URL_TEST: 'postgresql://localhost/fivondronana_test',
      NODE_ENV: 'development',
      API_PORT: '5106',
    });

    expect(env.DATABASE_URL).toBe('postgresql://localhost/fivondronana_test');
    expect(env.NODE_ENV).toBe('test');
    expect(env.API_PORT).toBe('5106');
  });
});

describe('demo seed environment safety', () => {
  it('refuses production based on either supported environment flag', () => {
    expect(() => assertDemoSeedAllowed({ NODE_ENV: 'production' })).toThrow(
      'The demo account seed is disabled in production.',
    );
    expect(() => assertDemoSeedAllowed({ APP_ENV: 'production' })).toThrow(
      'The demo account seed is disabled in production.',
    );
    expect(() => assertDemoSeedAllowed({ APP_ENV: 'development' })).not.toThrow();
    expect(() => assertDemoSeedAllowed({ NODE_ENV: 'development' })).toThrow(
      'The demo account seed is allowed only when APP_ENV=development.',
    );
    expect(() => assertDemoSeedAllowed({ APP_ENV: 'staging' })).toThrow(
      'The demo account seed is allowed only when APP_ENV=development.',
    );
    expect(() => assertDemoSeedAllowed({})).toThrow('The demo account seed is allowed only when APP_ENV=development.');
  });

  it('requires the database URL before attempting to seed', () => {
    expect(() => requireDemoDatabaseUrl({})).toThrow('DATABASE_URL must be set before creating the demo account.');
    expect(requireDemoDatabaseUrl({ DATABASE_URL: 'postgresql://localhost/fivondronana' })).toBe(
      'postgresql://localhost/fivondronana',
    );
  });
});

describe('API database configuration safety', () => {
  it('fails before creating a database client when DATABASE_URL is absent', () => {
    expect(() => requireDatabaseUrl({})).toThrow('DATABASE_URL must be set before starting the API.');
    expect(requireDatabaseUrl({ DATABASE_URL: 'postgresql://localhost/fivondronana' })).toBe(
      'postgresql://localhost/fivondronana',
    );
  });
});
