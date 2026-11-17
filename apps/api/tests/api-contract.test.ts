import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { describe, expect, test } from 'bun:test';
import type { AddressInfo } from 'node:net';
import { apiValidationPipe } from '../src/api-validation.js';
import { configureApiApp } from '../src/api-bootstrap.js';
import { ApiExceptionFilter, normalizeApiError } from '../src/api-errors.js';
import {
  createPaginatedResponse,
  getPaginationOffset,
  MAX_PAGE_NUMBER,
  MAX_PAGE_SIZE,
  PaginationQueryDto,
} from '../src/common/pagination.js';
import { createOpenApiConfig, OPENAPI_PREFIX } from '../src/openapi.js';

describe('API error contract', () => {
  test('normalizes validation errors to a stable public shape', () => {
    const result = normalizeApiError(new BadRequestException(['identifier is required']), '/api/auth/login');

    expect(result).toEqual({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: ['identifier is required'],
      path: '/api/auth/login',
    });
  });

  test('does not expose internal server error details', () => {
    const result = normalizeApiError(new InternalServerErrorException('database password leaked'), '/api/private');

    expect(result).toEqual({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Une erreur interne est survenue.',
      path: '/api/private',
    });
  });

  test('maps an unknown exception to a generic internal error', () => {
    const result = normalizeApiError(new Error('private implementation detail'), '/api/private');

    expect(result.statusCode).toBe(500);
    expect(result.message).not.toContain('private implementation detail');
  });

  test('writes the normalized response through the Nest HTTP adapter', () => {
    const filter = new ApiExceptionFilter();
    const response = { statusCode: -1, body: undefined as unknown };
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/api/example' }),
        getResponse: () => ({
          status(code: number) {
            response.statusCode = code;
            return this;
          },
          json(body: unknown) {
            response.body = body;
          },
        }),
      }),
    } as never;

    filter.catch(new BadRequestException('invalid'), host);

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'invalid',
      path: '/api/example',
    });
  });
});

describe('API pagination contract', () => {
  const metadata = { type: 'query' as const, metatype: PaginationQueryDto, data: '' };

  test('defaults to page one with twenty results', async () => {
    const result = await apiValidationPipe.transform({}, metadata);

    expect(result).toBeInstanceOf(PaginationQueryDto);
    expect(result).toMatchObject({ page: 1, pageSize: 20 });
  });

  test('transforms valid query strings into bounded integers', async () => {
    const result = await apiValidationPipe.transform({ page: '3', pageSize: '50' }, metadata);

    expect(result).toMatchObject({ page: 3, pageSize: 50 });
  });

  test.each([
    { page: '0', pageSize: '20' },
    { page: '1', pageSize: '101' },
    { page: 'abc', pageSize: '20' },
    { page: '90071992547410', pageSize: '100' },
  ])('rejects invalid pagination query %#', async (query) => {
    await expect(apiValidationPipe.transform(query, metadata)).rejects.toMatchObject({ status: 400 });
  });

  test('returns a stable page envelope and correct final-page metadata', () => {
    expect(createPaginatedResponse(['one', 'two'], 42, { page: 3, pageSize: 20 })).toEqual({
      data: ['one', 'two'],
      pagination: { page: 3, pageSize: 20, total: 42, totalPages: 3 },
    });
  });

  test('calculates a zero-based database offset from the one-based page contract', async () => {
    const query = (await apiValidationPipe.transform({ page: '3', pageSize: '25' }, metadata)) as PaginationQueryDto;

    expect(getPaginationOffset(query)).toEqual({ skip: 50, take: 25 });
  });

  test('returns zero total pages for an empty result', () => {
    expect(createPaginatedResponse([], 0, { page: 1, pageSize: 20 }).pagination.totalPages).toBe(0);
  });

  test('rejects invalid metadata instead of returning an incoherent pagination envelope', () => {
    expect(() => createPaginatedResponse([], -1, { page: 1, pageSize: 20 })).toThrow(RangeError);
    expect(() => createPaginatedResponse([], 1, { page: 1, pageSize: 0 })).toThrow(RangeError);
    expect(() => getPaginationOffset({ page: MAX_PAGE_NUMBER + 1, pageSize: MAX_PAGE_SIZE })).toThrow(RangeError);
  });
});

describe('OpenAPI contract version', () => {
  test('uses a semantic API contract version and the shared docs prefix', () => {
    const document = createOpenApiConfig().build();

    expect(document.info.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(OPENAPI_PREFIX).toBe('api');
  });

  test('publishes the shared error and pagination schemas in the HTTP OpenAPI document', async () => {
    const app = await NestFactory.create((await import('../src/modules/health/health.module.js')).HealthModule, {
      logger: false,
    });
    configureApiApp(app);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/docs-json`);
      const document = (await response.json()) as {
        components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> };
      };

      expect(response.status).toBe(200);
      expect(document.components?.schemas?.ApiErrorResponseDto?.properties).toHaveProperty('code');
      expect(document.components?.schemas?.ApiErrorResponseDto?.properties).toHaveProperty('path');
      expect(document.components?.schemas?.PaginationQueryDto?.properties).toHaveProperty('pageSize');
    } finally {
      await app.close();
    }
  });
});
