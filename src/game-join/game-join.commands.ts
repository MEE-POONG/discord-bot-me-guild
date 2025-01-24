import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { GuildMember } from 'discord.js';
import { NecordPaginationService } from '@necord/pagination';
@Injectable()
export class GameJoinCommands {
  constructor(private readonly paginationService: NecordPaginationService) {}

  @SlashCommand({ name: 'game-join', description: 'Join Game' })
  public async onGameJoin(@Context() [interaction]: SlashCommandContext) {
    const pagination = this.paginationService.get('GAME_JOIN');
    const page = await pagination.build();

    if (interaction.member instanceof GuildMember) {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: 'คุณต้องเชื่อมต่อกับช่องเสียงก่อน',
          ephemeral: true,
        });
      }
    }

    return interaction.reply({ ...page, ephemeral: true });
  }
}
