import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { RequirePermission } from '../authorization/authorization.decorator.js';
import { Permission } from '../authorization/permissions.js';
import { RequirePermissionsGuard } from '../authorization/require-permissions.guard.js';
import { ContactQueryDto } from './dto/contact-query.dto.js';
import { ContactsService } from './contacts.service.js';

@Controller('contacts')
@ApiTags('contacts')
@UseGuards(AccessTokenGuard, RequirePermissionsGuard)
@RequirePermission(Permission.CONTACTS_READ)
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  list(@Query() query: ContactQueryDto) {
    return this.contacts.list(query);
  }
}
