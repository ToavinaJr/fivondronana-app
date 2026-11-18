import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AdministrationController, UserResponsibilitiesController } from './administration.controller.js';
import { ResponsibilitiesService } from './responsibilities.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [AdministrationController, UserResponsibilitiesController],
  providers: [ResponsibilitiesService],
})
export class AdministrationModule {}
