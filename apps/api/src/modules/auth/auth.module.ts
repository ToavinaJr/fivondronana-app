import { Module } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../database/prisma.service.js';

@Module({
  controllers: [AuthController],
  providers: [{ provide: AuthService, inject: [PrismaService], useFactory: (prisma: PrismaService) => new AuthService(prisma) }, AccessTokenGuard],
  exports: [AuthService, AccessTokenGuard],
})
export class AuthModule {}
