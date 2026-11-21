import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { CreateResponsibilityDto } from './dto/create-responsibility.dto.js';
import { ResponsibilitiesService } from './responsibilities.service.js';

@Controller('admin/responsibilities')
@ApiTags('administration')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.RESPONSIBILITIES_MANAGE)
export class AdministrationController {
  constructor(private readonly responsibilities: ResponsibilitiesService) {}

  @Get()
  list() {
    return this.responsibilities.list();
  }

  @Post()
  create(@Body() body: CreateResponsibilityDto) {
    return this.responsibilities.create(body.name);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: CreateResponsibilityDto) {
    return this.responsibilities.update(id, body.name);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.responsibilities.remove(id);
  }
}

@Controller('admin/users/:userId/responsibilities')
@ApiTags('administration')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.RESPONSIBILITIES_MANAGE)
export class UserResponsibilitiesController {
  constructor(private readonly responsibilities: ResponsibilitiesService) {}

  @Post(':responsibilityId')
  @HttpCode(204)
  async assign(@Param('userId') userId: string, @Param('responsibilityId') responsibilityId: string): Promise<void> {
    await this.responsibilities.assign(userId, responsibilityId);
  }

  @Delete(':responsibilityId')
  @HttpCode(204)
  async unassign(@Param('userId') userId: string, @Param('responsibilityId') responsibilityId: string): Promise<void> {
    await this.responsibilities.unassign(userId, responsibilityId);
  }
}
