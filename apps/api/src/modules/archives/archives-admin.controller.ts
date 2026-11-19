import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { ArchivesService } from './archives.service.js';
import { CreateArchiveDto } from './dto/create-archive.dto.js';
import { SetArchivePublishedDto } from './dto/set-archive-published.dto.js';

type UploadedArchive = { buffer: Buffer; originalname: string; size: number };

@Controller('admin/archives')
@ApiTags('administration')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.ARCHIVES_MANAGE)
export class ArchivesAdminController {
  constructor(private readonly archives: ArchivesService) {}

  @Get()
  list() {
    return this.archives.listForAdministration();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  upload(@Body() body: CreateArchiveDto, @UploadedFile() file?: UploadedArchive) {
    return this.archives.upload(body, file);
  }

  @Patch(':archiveId/published')
  publish(@Param('archiveId') id: string, @Body() body: SetArchivePublishedDto) {
    return this.archives.setPublished(id, body.isPublished);
  }

  @Delete(':archiveId')
  @HttpCode(204)
  async remove(@Param('archiveId') id: string): Promise<void> {
    await this.archives.remove(id);
  }
}
