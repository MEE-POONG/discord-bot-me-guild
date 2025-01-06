import { Module } from '@nestjs/common';
import { GuildInviteService } from './guild-invite.service';
import { GuildInviteCommands } from './guild-invite.commands';

@Module({
  providers: [GuildInviteService, GuildInviteCommands],
})
export class GuildInviteModule {}
