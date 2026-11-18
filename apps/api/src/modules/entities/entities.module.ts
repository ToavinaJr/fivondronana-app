import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { EntitiesController } from './entities.controller.js';
import { EntitiesAdminController } from './entities-admin.controller.js';
import { EntitiesService } from './entities.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [EntitiesController, EntitiesAdminController],
  providers: [EntitiesService],
  exports: [EntitiesService],
})
export class EntitiesModule {}
