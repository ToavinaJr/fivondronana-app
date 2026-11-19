import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { ArchivesAdminController } from './archives-admin.controller.js';
import { ArchivesController } from './archives.controller.js';
import { ArchivesService } from './archives.service.js';
import { ClamAvScanner } from './clamav.scanner.js';
import { PostgresFileStorage } from './postgres-file-storage.js';
import { FILE_STORAGE, VIRUS_SCANNER } from './file-storage.js';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [ArchivesController, ArchivesAdminController],
  providers: [
    ArchivesService,
    ClamAvScanner,
    PostgresFileStorage,
    { provide: FILE_STORAGE, useExisting: PostgresFileStorage },
    { provide: VIRUS_SCANNER, useExisting: ClamAvScanner },
  ],
})
export class ArchivesModule {}
