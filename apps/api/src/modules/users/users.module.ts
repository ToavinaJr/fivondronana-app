import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SendGridMailer } from '../auth/sendgrid-mailer.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { LeadersController } from './leaders.controller.js';
import { LeaderService } from './leader.service.js';
import { UsersAdminController } from './users-admin.controller.js';
import { UsersAdminService } from './users-admin.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [LeadersController, UsersAdminController],
  providers: [LeaderService, UsersAdminService, SendGridMailer],
})
export class UsersModule {}
