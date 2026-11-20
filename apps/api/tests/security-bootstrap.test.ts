import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { Controller, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApiApp } from '../src/api-bootstrap.js';
import { getAllowedOrigins, getPositiveInteger, RequestRateLimiter } from '../src/http-security.js';

@Controller('auth')
class RateLimitProbeController {
  @Post('login')
  login() {
    return { status: 'ok' };
  }
}

@Module({ controllers: [RateLimitProbeController] })
class RateLimitProbeModule {}

describe('HTTP security policy', () => {
  it('requires an explicit HTTPS origin allowlist in production', () => {
    expect(() => getAllowedOrigins({ NODE_ENV: 'production' })).toThrow(
      'CORS_ALLOWED_ORIGINS must be configured in production.',
    );
    expect(() => getAllowedOrigins({ NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: '*' })).toThrow(
      'Wildcard CORS origins are not allowed.',
    );
    expect(getAllowedOrigins({ NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: 'https://admin.example.org' })).toEqual([
      'https://admin.example.org',
    ]);
    expect(() =>
      getAllowedOrigins({ NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: 'http://admin.example.org' }),
    ).toThrow('Production CORS origins must use HTTPS.');
  });

  it('allows the local backoffice origin by default outside production', () => {
    expect(getAllowedOrigins({ NODE_ENV: 'development' })).toEqual(['http://localhost:5173']);
  });

  it('uses the configured backoffice URL origin when no explicit CORS origins are set', () => {
    expect(getAllowedOrigins({ NODE_ENV: 'development', BACKOFFICE_URL: 'http://localhost:9631/admin' })).toEqual([
      'http://localhost:9631',
    ]);
  });

  it('keeps explicit CORS origins authoritative over the backoffice URL', () => {
    expect(
      getAllowedOrigins({
        NODE_ENV: 'development',
        BACKOFFICE_URL: 'http://localhost:9631',
        CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
      }),
    ).toEqual(['http://localhost:5173']);
  });

  it('limits repeated sensitive requests per key and resets after the window', () => {
    let now = 1000;
    const limiter = new RequestRateLimiter(2, 5000, () => now);
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip')).toEqual({ allowed: false, retryAfterSeconds: 5 });
    now = 6001;
    expect(limiter.check('ip').allowed).toBe(true);
  });

  it('validates configurable positive integer limits', () => {
    expect(getPositiveInteger('7', 10, 'API_RATE_LIMIT')).toBe(7);
    expect(() => getPositiveInteger('0', 10, 'API_RATE_LIMIT')).toThrow('API_RATE_LIMIT must be a positive integer.');
  });

  it('applies the configured limit and security headers to login HTTP requests', async () => {
    const originalLimit = process.env.AUTH_RATE_LIMIT;
    const originalWindow = process.env.AUTH_RATE_WINDOW_SECONDS;
    const originalBodyLimit = process.env.API_BODY_LIMIT;
    process.env.AUTH_RATE_LIMIT = '1';
    process.env.AUTH_RATE_WINDOW_SECONDS = '60';
    process.env.API_BODY_LIMIT = '32b';
    const app = await NestFactory.create<NestExpressApplication>(RateLimitProbeModule, {
      bodyParser: false,
      logger: false,
    });
    try {
      configureApiApp(app);
      await app.listen(0, '127.0.0.1');
      const address = app.getHttpServer().address() as { port: number };
      const endpoint = `http://127.0.0.1:${address.port}/api/auth/login`;
      const first = await fetch(endpoint, { method: 'POST' });
      const limited = await fetch(endpoint, { method: 'POST' });
      const oversized = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'x'.repeat(100), password: 'secret' }),
      });
      expect(first.status).toBe(201);
      expect(limited.status).toBe(429);
      expect(oversized.status).toBe(413);
      expect(limited.headers.get('retry-after')).toBeTruthy();
      expect(limited.headers.get('x-content-type-options')).toBe('nosniff');
      expect(limited.headers.get('x-frame-options')).toBe('DENY');
    } finally {
      await app.close();
      restoreEnvironment('AUTH_RATE_LIMIT', originalLimit);
      restoreEnvironment('AUTH_RATE_WINDOW_SECONDS', originalWindow);
      restoreEnvironment('API_BODY_LIMIT', originalBodyLimit);
    }
  });

  it('enables credentialed CORS for the configured backoffice origin', async () => {
    const previousOrigins = process.env.CORS_ALLOWED_ORIGINS;
    process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:5173';
    const app = await NestFactory.create<NestExpressApplication>(RateLimitProbeModule, {
      bodyParser: false,
      logger: false,
    });
    try {
      configureApiApp(app);
      await app.listen(0, '127.0.0.1');
      const address = app.getHttpServer().address() as { port: number };
      const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,x-csrf-token',
        },
      });

      expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
      expect(response.headers.get('access-control-allow-credentials')).toBe('true');
      expect(response.headers.get('access-control-allow-headers')?.toLowerCase()).toContain('x-csrf-token');
    } finally {
      await app.close();
      restoreEnvironment('CORS_ALLOWED_ORIGINS', previousOrigins);
    }
  });
});

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
