import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { LeaderQueryDto } from './dto/leader-query.dto.js';
import { LeaderService } from './leader.service.js';

@Controller('leaders')
@ApiTags('leaders')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.LEADERS_READ)
export class LeadersController {
  constructor(private readonly leaders: LeaderService) {}

  @Get('facets')
  facets() {
    return this.leaders.listFacets();
  }

  @Get()
  list(@Query() query: LeaderQueryDto) {
    return this.leaders.list(query);
  }
}
