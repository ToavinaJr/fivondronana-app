import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApiApp } from './api-bootstrap.js';
import { validateRuntimeEnvironment } from './runtime-config.js';

async function bootstrap(): Promise<void> {
  const { port } = validateRuntimeEnvironment(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  configureApiApp(app);

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
