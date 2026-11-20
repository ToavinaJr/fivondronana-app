import { type NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { ApiErrorResponseDto, ApiExceptionFilter } from './api-errors.js';
import { apiValidationPipe } from './api-validation.js';
import { PaginationQueryDto } from './common/pagination.js';
import { getAllowedOrigins, getPositiveInteger, RequestRateLimiter } from './http-security.js';
import { browserMutationAllowed, REFRESH_COOKIE, readCookie } from './modules/auth/browser-session.js';
import { createOpenApiConfig, OPENAPI_PREFIX } from './openapi.js';

type SecurityRequest = {
  method: string;
  path: string;
  ip?: string;
  socket: { remoteAddress?: string };
  headers?: { cookie?: string; origin?: string; 'x-csrf-token'?: string };
};
type SecurityResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
};

export function configureApiApp(app: NestExpressApplication): void {
  const allowedOrigins = getAllowedOrigins(process.env);
  if (allowedOrigins.length > 0)
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    });
  const bodyLimit = process.env.API_BODY_LIMIT ?? '100kb';
  app.useBodyParser('json', { limit: bodyLimit });
  app.useBodyParser('urlencoded', { limit: bodyLimit, extended: true });
  const limiter = new RequestRateLimiter(
    getPositiveInteger(process.env.AUTH_RATE_LIMIT, 10, 'AUTH_RATE_LIMIT'),
    getPositiveInteger(process.env.AUTH_RATE_WINDOW_SECONDS, 60, 'AUTH_RATE_WINDOW_SECONDS') * 1000,
  );
  app.use((request: SecurityRequest, response: SecurityResponse, next: () => void) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production')
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    const cookieHeader = request.headers?.cookie;
    const browserAuthEndpoint = [
      '/api/auth/browser/login',
      '/api/auth/browser/refresh',
      '/api/auth/browser/logout',
    ].includes(request.path);
    if (
      browserAuthEndpoint &&
      request.method !== 'OPTIONS' &&
      (!request.headers?.origin || !allowedOrigins.includes(request.headers.origin))
    ) {
      response.status(403).json({ statusCode: 403, message: 'Origine du navigateur non autorisée.' });
      return;
    }
    const browserCookiesPresent =
      readCookie(cookieHeader, REFRESH_COOKIE) !== undefined ||
      readCookie(cookieHeader, '__Host-fivondronana-access') !== undefined;
    if (
      browserCookiesPresent &&
      !browserMutationAllowed(
        request.method,
        {
          cookie: cookieHeader,
          origin: request.headers?.origin,
          'x-csrf-token': request.headers?.['x-csrf-token'],
        },
        allowedOrigins,
      )
    ) {
      response.status(403).json({ statusCode: 403, message: 'Vérification de sécurité du navigateur échouée.' });
      return;
    }
    if (
      request.method === 'POST' &&
      [
        '/api/auth/login',
        '/api/auth/refresh',
        '/api/auth/logout',
        '/api/auth/password',
        '/api/auth/password-recovery',
        '/api/auth/password-reset',
        '/api/auth/activate',
        '/api/auth/browser/login',
        '/api/auth/browser/refresh',
        '/api/auth/browser/logout',
      ].includes(request.path)
    ) {
      const decision = limiter.check(`${request.path}:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`);
      if (!decision.allowed) {
        response.setHeader('Retry-After', String(decision.retryAfterSeconds));
        response.status(429).json({ statusCode: 429, message: 'Trop de requêtes. Réessayez plus tard.' });
        return;
      }
    }
    next();
  });
  app.setGlobalPrefix(OPENAPI_PREFIX);
  app.useGlobalPipes(apiValidationPipe);
  app.useGlobalFilters(new ApiExceptionFilter());

  const document = SwaggerModule.createDocument(app, createOpenApiConfig().build(), {
    extraModels: [ApiErrorResponseDto, PaginationQueryDto],
  });
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });
}
