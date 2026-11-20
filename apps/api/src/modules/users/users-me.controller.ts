import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard.js';
import { PrismaService } from '../database/prisma.service.js';
import { AvatarService, MAX_AVATAR_SIZE } from './avatar.service.js';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto.js';

type UploadedAvatar = { buffer: Buffer; originalname: string; size: number };
type DownloadResponse = { setHeader(name: string, value: string): void; send(data: Uint8Array): void };

@Controller('users/me')
@ApiTags('profile')
@UseGuards(AccessTokenGuard)
export class UsersMeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly avatars: AvatarService,
  ) {}

  @Patch()
  async update(@Req() request: AuthenticatedRequest, @Body() body: UpdateOwnProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: request.auth.user.id },
      data: { accountName: body.accountName },
      select: { id: true, accountName: true, email: true, phone: true, avatarKey: true },
    });
    return {
      id: updated.id,
      accountName: updated.accountName,
      email: updated.email,
      phone: updated.phone,
      hasAvatar: Boolean(updated.avatarKey),
    };
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_SIZE, files: 1 } }))
  uploadAvatar(@Req() request: AuthenticatedRequest, @UploadedFile() file?: UploadedAvatar) {
    return this.avatars.upload(request.auth.user.id, file);
  }

  @Delete('avatar')
  @HttpCode(204)
  async removeAvatar(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.avatars.remove(request.auth.user.id);
  }

  @Get('avatar')
  async getAvatar(@Req() request: AuthenticatedRequest, @Res() response: DownloadResponse): Promise<void> {
    const file = await this.avatars.getAvatar(request.auth.user.id);
    sendAvatar(response, file);
  }
}

export function sendAvatar(response: DownloadResponse, file: { data: Uint8Array; contentType: string }): void {
  response.setHeader('Content-Type', file.contentType);
  response.setHeader('Content-Length', String(file.data.byteLength));
  response.setHeader('Content-Disposition', 'inline');
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.send(file.data);
}
