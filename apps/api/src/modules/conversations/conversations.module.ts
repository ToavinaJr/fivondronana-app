import { Module } from '@nestjs/common';
import { ClamAvScanner } from '../archives/clamav.scanner.js';
import { FILE_STORAGE, VIRUS_SCANNER } from '../archives/file-storage.js';
import { PostgresFileStorage } from '../archives/postgres-file-storage.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';
import { ConversationsAdminController } from './conversations-admin.controller.js';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [ConversationsController, ConversationsAdminController],
  providers: [
    ConversationsService,
    ClamAvScanner,
    PostgresFileStorage,
    { provide: FILE_STORAGE, useExisting: PostgresFileStorage },
    { provide: VIRUS_SCANNER, useExisting: ClamAvScanner },
  ],
})
export class ConversationsModule {}
