import { Injectable } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { GuildInviteService } from './guild-invite.service';
import { GuildInviteDto } from './dto/length.dto';

@Injectable()
export class GuildInviteCommands {
  constructor(private readonly guildInviteService: GuildInviteService) {}

  @SlashCommand({
    name: 'guild-invite',
    description: 'เชิญสมาชิกเข้าร่วมกิลด์',
    defaultMemberPermissions: '0',
  })
  public async onGuildInvite(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: GuildInviteDto,
  ) {
    await this.guildInviteService.inviteMember(interaction, options);
  }
}
