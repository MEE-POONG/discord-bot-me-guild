import { Injectable } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { GuildKickService } from './guild-kick.service';
import { GuildKickDto } from './dto/length.dto';

@Injectable()
export class GuildKickCommands {
  constructor(private readonly guildKickService: GuildKickService) {}

  @SlashCommand({
    name: 'guild-kick',
    description: 'ยกเลิกการเชิญสมาชิกเข้าร่วมกิลด์',
    defaultMemberPermissions: '0',
  })
  public async onGuildKick(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: GuildKickDto,
  ) {
    await this.guildKickService.kickMember(interaction, options);
  }
}
