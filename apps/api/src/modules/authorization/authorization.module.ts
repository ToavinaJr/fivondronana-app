import { Global, Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service.js';
import { RequirePermissionsGuard } from './require-permissions.guard.js';

@Global()
@Module({
  providers: [AuthorizationService, RequirePermissionsGuard],
  exports: [AuthorizationService, RequirePermissionsGuard],
})
export class AuthorizationModule {}
