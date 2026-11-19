import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { ArchivesService } from './archives.service.js';

type DownloadResponse = { setHeader(name: string, value: string): void; send(data: Uint8Array): void };

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
    response.setHeader('Content-Type', archive.contentType);
    response.setHeader('Content-Length', String(data.byteLength));
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="archive-${archive.id}${archive.fileName.slice(archive.fileName.lastIndexOf('.'))}"`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(data);
  }
}
