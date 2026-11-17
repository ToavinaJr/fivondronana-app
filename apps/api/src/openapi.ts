import { DocumentBuilder } from '@nestjs/swagger';

export const OPENAPI_PREFIX = 'api';
export const OPENAPI_VERSION = '0.1.0';

export function createOpenApiConfig(): DocumentBuilder {
  return new DocumentBuilder()
    .setTitle('FIVONDRONANA API')
    .setDescription('API de la plateforme FIVONDRONANA.')
    .setVersion(OPENAPI_VERSION);
}
