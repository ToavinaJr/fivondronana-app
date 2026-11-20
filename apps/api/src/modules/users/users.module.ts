import { Module } from '@nestjs/common';
import { ClamAvScanner } from '../archives/clamav.scanner.js';
import { FILE_STORAGE, VIRUS_SCANNER } from '../archives/file-storage.js';
import { PostgresFileStorage } from '../archives/postgres-file-storage.js';
import { AuthModule } from '../auth/auth.module.js';
import { SendGridMailer } from '../auth/sendgrid-mailer.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AvatarService } from './avatar.service.js';
import { LeaderService } from './leader.service.js';
import { LeadersController } from './leaders.controller.js';
import { UsersAdminController } from './users-admin.controller.js';
import { UsersAdminService } from './users-admin.service.js';
import { UsersMeController } from './users-me.controller.js';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [LeadersController, UsersAdminController, UsersMeController],
  providers: [
    LeaderService,
    UsersAdminService,
    SendGridMailer,
    AvatarService,
    ClamAvScanner,
    PostgresFileStorage,
    { provide: FILE_STORAGE, useExisting: PostgresFileStorage },
    { provide: VIRUS_SCANNER, useExisting: ClamAvScanner },
  ],
})
export class UsersModule {}
