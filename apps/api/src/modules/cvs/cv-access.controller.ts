import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { CvAccessService } from './cv-access.service.js';
import { PaginationQueryDto } from '../../common/pagination.js';

@Controller('cvs/responsibles')
@ApiTags('curriculum vitae')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.CV_READ_ANY)
export class CvAccessController {
  constructor(private readonly cvs: CvAccessService) {}

  @Get()
  listAll(@Query() query: PaginationQueryDto) {
    return this.cvs.listResponsibleCvs(query);
  }

  @Get(':userId')
  async getResponsibleCv(@Param('userId') userId: string) {
    const cv = await this.cvs.getByUserId(userId);
    if (!cv) throw new NotFoundException('CV introuvable.');
    return cv;
  }
}
