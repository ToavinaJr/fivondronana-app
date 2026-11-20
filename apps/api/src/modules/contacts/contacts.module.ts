import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { ContactsController } from './contacts.controller.js';
import { ContactsService } from './contacts.service.js';
import { ContactsAdminController } from './contacts-admin.controller.js';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [ContactsController, ContactsAdminController],
  providers: [ContactsService],
})
export class ContactsModule {}
