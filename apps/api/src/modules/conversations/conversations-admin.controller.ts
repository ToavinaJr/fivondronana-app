import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { ConversationsService } from './conversations.service.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { SetConversationActiveDto } from './dto/set-conversation-active.dto.js';

@Controller('admin/conversations')
@ApiTags('administration')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.CONVERSATIONS_MANAGE)
export class ConversationsAdminController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list() {
    return this.conversations.listForAdministration();
  }

  @Post()
  create(@Body() body: CreateConversationDto) {
    return this.conversations.createEntityConversation(body.title, body.entityId);
  }

  @Patch(':conversationId/active')
  setActive(@Param('conversationId') id: string, @Body() body: SetConversationActiveDto) {
    return this.conversations.setActive(id, body.isActive);
  }
}
