import { type INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { ApiErrorResponseDto, ApiExceptionFilter } from './api-errors.js';
import { apiValidationPipe } from './api-validation.js';
import { PaginationQueryDto } from './common/pagination.js';
import { createOpenApiConfig, OPENAPI_PREFIX } from './openapi.js';

export function configureApiApp(app: INestApplication): void {
  app.setGlobalPrefix(OPENAPI_PREFIX);
  app.useGlobalPipes(apiValidationPipe);
  app.useGlobalFilters(new ApiExceptionFilter());

  const document = SwaggerModule.createDocument(app, createOpenApiConfig().build(), {
    extraModels: [ApiErrorResponseDto, PaginationQueryDto],
  });
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });
}
