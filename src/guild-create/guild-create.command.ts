import { Injectable } from '@nestjs/common';
import { GuildCreateService } from './guild-create.service';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { GuildCreateDto } from './dto/length.dto';
@Injectable()
export class GuildCreateCommand {
  constructor(private readonly guildCreateService: GuildCreateService) {}

  @SlashCommand({
    name: 'guild-create',
    description: 'สร้างกิลด์ (ฟรี)',
    defaultMemberPermissions: '0',
  })
  async handle(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: GuildCreateDto,
  ): Promise<void> {
    await this.guildCreateService.createGuild(interaction, options);
  }
}
