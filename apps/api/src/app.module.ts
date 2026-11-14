import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './modules/database/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { CvsModule } from './modules/cvs/cvs.module.js';
import { ArchivesModule } from './modules/archives/archives.module.js';
import { ConversationsModule } from './modules/conversations/conversations.module.js';
import { ContactsModule } from './modules/contacts/contacts.module.js';
import { AdministrationModule } from './modules/administration/administration.module.js';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CvsModule,
    ArchivesModule,
    ConversationsModule,
    ContactsModule,
    AdministrationModule,
  ],
})
export class AppModule {}
