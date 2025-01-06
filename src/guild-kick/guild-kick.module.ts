import { Module } from '@nestjs/common';
import { GuildKickService } from './guild-kick.service';
import { GuildKickCommands } from './guild-kick.commands';

@Module({
  providers: [GuildKickService, GuildKickCommands],
})
export class GuildKickModule {}
