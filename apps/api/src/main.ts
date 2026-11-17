import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApiApp } from './api-bootstrap.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApiApp(app);

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
