import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { LeadersController } from './leaders.controller.js';
import { LeaderService } from './leader.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [LeadersController],
  providers: [LeaderService],
})
export class UsersModule {}
