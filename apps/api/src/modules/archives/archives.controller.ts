import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { type DownloadResponse, sendArchiveFile } from './archive-download.js';
import { ArchivesService } from './archives.service.js';

@Controller('archives')
@ApiTags('archives')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.ARCHIVES_READ)
export class ArchivesController {
  constructor(private readonly archives: ArchivesService) {}

  @Get()
  list() {
    return this.archives.list();
  }

  @Get(':archiveId/download')
  async download(@Param('archiveId') id: string, @Res() response: DownloadResponse): Promise<void> {
    const { archive, data } = await this.archives.getDownload(id);
    sendArchiveFile(response, archive, data);
  }
}
