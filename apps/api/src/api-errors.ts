import { ArgumentsHost, Catch, HttpException, Logger, type ExceptionFilter } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export type ApiErrorResponse = {
  statusCode: number;
  code: string;
  message: string | string[];
  path: string;
};

export class ApiErrorResponseDto implements ApiErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'BAD_REQUEST' })
  code!: string;

  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  message!: string | string[];

  @ApiProperty({ example: '/api/auth/login' })
  path!: string;
}

const statusCodes: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
};

export function normalizeApiError(exception: unknown, requestUrl: string): ApiErrorResponse {
  const statusCode = exception instanceof HttpException ? exception.getStatus() : 500;
  const path = safePath(requestUrl);

  if (statusCode >= 500) {
    return {
      statusCode,
      code: statusCodes[statusCode] ?? 'INTERNAL_SERVER_ERROR',
      message: 'Une erreur interne est survenue.',
      path,
    };
  }

  const response = exception instanceof HttpException ? exception.getResponse() : null;
  const message = extractMessage(response) ?? 'La requête ne peut pas être traitée.';
  return { statusCode, code: statusCodes[statusCode] ?? 'HTTP_ERROR', message, path };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<{ url?: string }>();
    const response = http.getResponse<{ status(code: number): { json(body: ApiErrorResponse): void } }>();
    const normalized = normalizeApiError(exception, request.url ?? '/');

    if (normalized.statusCode >= 500) this.logger.error('Unexpected API exception');
    response.status(normalized.statusCode).json(normalized);
  }
}

function extractMessage(response: unknown): string | string[] | null {
  if (typeof response === 'string') return response;
  if (!response || typeof response !== 'object' || !('message' in response)) return null;
  const { message } = response;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) return message;
  return null;
}

function safePath(requestUrl: string): string {
  try {
    return new URL(requestUrl, 'http://localhost').pathname;
  } catch {
    return '/';
  }
}
