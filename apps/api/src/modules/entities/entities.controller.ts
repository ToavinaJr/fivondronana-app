import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { AssignResponsibleDto } from './dto/assign-responsible.dto.js';
import { EntitiesService } from './entities.service.js';

@Controller('admin/entity-assignments')
@ApiTags('administration')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.ENTITIES_MANAGE)
export class EntitiesController {
  constructor(private readonly entities: EntitiesService) {}

  @Post()
  @HttpCode(204)
  async assign(@Body() assignment: AssignResponsibleDto): Promise<void> {
    await this.entities.assignResponsible(assignment.userId, assignment.entityId, assignment.groupId);
  }
}
