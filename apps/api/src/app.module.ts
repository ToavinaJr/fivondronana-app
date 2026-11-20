import { Module } from '@nestjs/common';
import { AdministrationModule } from './modules/administration/administration.module.js';
import { ArchivesModule } from './modules/archives/archives.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AuthorizationModule } from './modules/authorization/authorization.module.js';
import { ContactsModule } from './modules/contacts/contacts.module.js';
import { ConversationsModule } from './modules/conversations/conversations.module.js';
import { CvsModule } from './modules/cvs/cvs.module.js';
import { PrismaModule } from './modules/database/prisma.module.js';
import { EntitiesModule } from './modules/entities/entities.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    AuthorizationModule,
    EntitiesModule,
    UsersModule,
    CvsModule,
    ArchivesModule,
    ConversationsModule,
    ContactsModule,
    AdministrationModule,
  ],
})
export class AppModule {}
