import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { validateRuntimeEnvironment } from '../src/runtime-config';

const valid = {
  DATABASE_URL: 'postgresql://localhost/example',
  JWT_SECRET: 'test-only-secret-with-more-than-32-characters',
  APP_ENV: 'development',
};

test('validates runtime configuration before starting Nest', () => {
  expect(validateRuntimeEnvironment(valid).port).toBe(3000);
  for (const API_PORT of ['0', '65536', '1.5', 'NaN']) {
    expect(() => validateRuntimeEnvironment({ ...valid, API_PORT })).toThrow('API_PORT');
  }
  expect(() => validateRuntimeEnvironment({ ...valid, APP_ENV: 'typo' })).toThrow('APP_ENV');
  expect(() => validateRuntimeEnvironment({ ...valid, JWT_SECRET: '' })).toThrow('JWT_SECRET');
  expect(() => validateRuntimeEnvironment({ ...valid, DATABASE_URL: 'https://private:secret@example.org/db' })).toThrow('DATABASE_URL');
  expect(() => validateRuntimeEnvironment({ ...valid, AUTH_RATE_LIMIT: '0' })).toThrow('AUTH_RATE_LIMIT');
});

test('production cannot accidentally use development HTTP policy', () => {
  expect(() => validateRuntimeEnvironment({ ...valid, APP_ENV: 'production', NODE_ENV: 'development' })).toThrow('NODE_ENV');
  expect(() => validateRuntimeEnvironment({ ...valid, APP_ENV: 'production', NODE_ENV: 'production' })).toThrow('CORS_ALLOWED_ORIGINS');
  expect(validateRuntimeEnvironment({ ...valid, APP_ENV: 'production', NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: 'https://admin.example.org' }).port).toBe(3000);
});

test('Compose forwards secrets and policy and keeps a non-root runtime', () => {
  const compose = readFileSync(new URL('../../../infra/docker-compose.yml', import.meta.url), 'utf8');
  expect(compose).toContain('JWT_SECRET: ${JWT_SECRET:?');
  expect(compose).toContain('CORS_ALLOWED_ORIGINS:');
  expect(compose).not.toContain('NODE_ENV: development');
  expect(compose).toContain('/api/health/ready');
  const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
  expect(dockerfile).toContain('USER bun');
});
