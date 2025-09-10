import { Injectable } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { GuildInviteService } from './guild-invite.service';
import { InviteRequestDto } from './dto/invite-request.dto';

@Injectable()
export class GuildInviteCommands {
  constructor(private readonly guildInviteService: GuildInviteService) {}

  @SlashCommand({
    name: 'guild-invite',
    description: 'เชิญสมาชิกเข้าร่วมกิลด์',
  })
  public async onGuildInvite(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: InviteRequestDto,
  ) {
    await this.guildInviteService.inviteMember(interaction, options);
  }
}
