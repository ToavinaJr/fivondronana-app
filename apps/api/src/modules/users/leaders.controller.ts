import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { AvatarService } from './avatar.service.js';
import { LeaderQueryDto } from './dto/leader-query.dto.js';
import { LeaderService } from './leader.service.js';
import { sendAvatar } from './users-me.controller.js';

type DownloadResponse = { setHeader(name: string, value: string): void; send(data: Uint8Array): void };

@Controller('leaders')
@ApiTags('leaders')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.LEADERS_READ)
export class LeadersController {
  constructor(
    private readonly leaders: LeaderService,
    private readonly avatars: AvatarService,
  ) {}

  @Get('facets')
  facets() {
    return this.leaders.listFacets();
  }

  @Get()
  list(@Query() query: LeaderQueryDto) {
    return this.leaders.list(query);
  }

  @Get(':leaderId/avatar')
  async avatar(@Param('leaderId') leaderId: string, @Res() response: DownloadResponse): Promise<void> {
    await this.leaders.assertVisible(leaderId);
    const file = await this.avatars.getAvatar(leaderId);
    sendAvatar(response, file);
  }
}
