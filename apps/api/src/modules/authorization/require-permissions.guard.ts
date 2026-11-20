import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth/access-token.guard.js';
import { REQUIRED_PERMISSION } from './authorization.decorator.js';
import { AuthorizationService } from './authorization.service.js';
import type { Permission } from './permissions.js';

type PermissionRequest = AuthenticatedRequest & {
  params: Record<string, string | undefined>;
};

@Injectable()
export class RequirePermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<Permission>(REQUIRED_PERMISSION, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) return true;
    const request = context.switchToHttp().getRequest<PermissionRequest>();
    const allowed = await this.authorization.hasPermission(request.auth.user.id, permission, {
      entityId: request.params.entityId,
      ownerId: request.params.userId ?? request.params.ownerId,
    });
    if (!allowed) throw new ForbiddenException('Cette action n’est pas autorisée.');
    return true;
  }
}
