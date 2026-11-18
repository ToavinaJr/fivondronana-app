import { Body, Controller, Delete, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { ContactsService } from './contacts.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { SetContactPublishedDto } from './dto/set-contact-published.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';

@Controller('admin/contacts')
@ApiTags('administration')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.CONTACTS_MANAGE)
export class ContactsAdminController {
  constructor(private readonly contacts: ContactsService) {}

  @Post()
  create(@Body() body: CreateContactDto) {
    return this.contacts.create(body);
  }

  @Patch(':contactId')
  update(@Param('contactId') contactId: string, @Body() body: UpdateContactDto) {
    return this.contacts.update(contactId, body);
  }

  @Patch(':contactId/published')
  setPublished(@Param('contactId') contactId: string, @Body() body: SetContactPublishedDto) {
    return this.contacts.setPublished(contactId, body.isPublished);
  }

  @Delete(':contactId')
  @HttpCode(204)
  async remove(@Param('contactId') contactId: string): Promise<void> {
    await this.contacts.remove(contactId);
  }
}
