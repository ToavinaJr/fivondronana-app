import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { CreateEntityDto } from './dto/create-entity.dto.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { SetActiveDto } from './dto/set-active.dto.js';
import { EntitiesService } from './entities.service.js';

@Controller('admin/entities')
@ApiTags('administration')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.ENTITIES_MANAGE)
export class EntitiesAdminController {
  constructor(private readonly entities: EntitiesService) {}

  @Get()
  list() {
    return this.entities.list();
  }

  @Post()
  create(@Body() body: CreateEntityDto) {
    return this.entities.create(body.name);
  }

  @Post(':entityId/groups')
  createGroup(@Param('entityId') entityId: string, @Body() body: CreateGroupDto) {
    return this.entities.createGroup(entityId, body.name);
  }

  @Patch(':entityId/active')
  setEntityActive(@Param('entityId') entityId: string, @Body() body: SetActiveDto) {
    return this.entities.setEntityActive(entityId, body.isActive);
  }

  @Patch(':entityId/groups/:groupId/active')
  setGroupActive(@Param('entityId') entityId: string, @Param('groupId') groupId: string, @Body() body: SetActiveDto) {
    return this.entities.setGroupActive(entityId, groupId, body.isActive);
  }
}
