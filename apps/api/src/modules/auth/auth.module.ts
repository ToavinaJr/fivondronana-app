import { Module } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { SendGridMailer } from './sendgrid-mailer.js';

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: AuthService,
      inject: [PrismaService, SendGridMailer],
      useFactory: (prisma: PrismaService, mailer: SendGridMailer) => new AuthService(prisma, undefined, mailer),
    },
    SendGridMailer,
    AccessTokenGuard,
  ],
  exports: [AuthService, AccessTokenGuard],
})
export class AuthModule {}
