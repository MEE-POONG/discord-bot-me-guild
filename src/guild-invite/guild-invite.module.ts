import { Module } from '@nestjs/common';
import { GuildInviteService } from './guild-invite.service';
import { GuildInviteCommands } from './guild-invite.commands';
import { PermissionService } from './services/permission.service';
import { ProfileService } from './services/profile.service';
import { ValidationService } from './services/validation.service';
import { InviteService } from './services/invite.service';
import { NotificationService } from './services/notification.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [
    GuildInviteService,
    GuildInviteCommands,
    PermissionService,
    ProfileService,
    ValidationService,
    InviteService,
    NotificationService,
    PrismaService,
  ],
})
export class GuildInviteModule {}
