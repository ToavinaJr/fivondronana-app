import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard.js';
import { MAX_ATTACHMENT_SIZE } from './attachment-types.js';
import { ConversationsService } from './conversations.service.js';

type UploadedAttachment = { buffer: Buffer; originalname: string; size: number };
type DownloadResponse = { setHeader(name: string, value: string): void; send(data: Uint8Array): void };

@Controller('conversations')
@ApiTags('conversations')
@UseGuards(AccessTokenGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.conversations.listForUser(request.auth.user.id);
  }

  @Get(':conversationId/messages')
  getMessages(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversations.getMessages(
      conversationId,
      request.auth.user.id,
      cursor,
      limit ? Number(limit) : undefined,
    );
  }

  @Post(':conversationId/messages')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_SIZE, files: 1 } }))
  sendMessage(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body('body') body: string | undefined,
    @UploadedFile() file?: UploadedAttachment,
  ) {
    return this.conversations.sendMessage(conversationId, request.auth.user.id, body, file);
  }

  @Get(':conversationId/messages/:messageId/attachment')
  async downloadAttachment(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Res() response: DownloadResponse,
  ): Promise<void> {
    const file = await this.conversations.getAttachment(conversationId, messageId, request.auth.user.id);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.data.byteLength));
    response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(file.data);
  }
}
