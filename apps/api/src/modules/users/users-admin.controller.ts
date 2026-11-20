import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { CreateUserAdminDto } from './dto/create-user-admin.dto.js';
import { SetUserActiveDto } from './dto/set-user-active.dto.js';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto.js';
import { UserAdminQueryDto } from './dto/user-admin-query.dto.js';
import { UsersAdminService } from './users-admin.service.js';

@Controller('admin/users')
@ApiTags('administration')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.USERS_MANAGE)
export class UsersAdminController {
  constructor(private readonly users: UsersAdminService) {}

  @Get()
  list(@Query() query: UserAdminQueryDto) {
    return this.users.list(query);
  }

  @Post()
  create(@Body() body: CreateUserAdminDto, @Req() request: AuthenticatedRequest) {
    return this.users.create(body, request.auth.user.id);
  }

  @Patch(':userId')
  update(@Param('userId') userId: string, @Body() body: UpdateUserAdminDto, @Req() request: AuthenticatedRequest) {
    return this.users.update(userId, body, request.auth.user.id);
  }

  @Patch(':userId/active')
  setActive(@Param('userId') userId: string, @Body() body: SetUserActiveDto, @Req() request: AuthenticatedRequest) {
    return this.users.setActive(userId, body.isActive, request.auth.user.id);
  }

  @Post(':userId/invitation')
  resendInvitation(@Param('userId') userId: string, @Req() request: AuthenticatedRequest) {
    return this.users.resendInvitation(userId, request.auth.user.id);
  }
}
