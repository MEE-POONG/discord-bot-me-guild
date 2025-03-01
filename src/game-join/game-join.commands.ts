import { Injectable } from '@nestjs/common';
import {
  Button,
  ButtonContext,
  Context,
  SlashCommand,
  SlashCommandContext,
} from 'necord';
import { GuildMember } from 'discord.js';
import { NecordPaginationService } from '@necord/pagination';
@Injectable()
export class GameJoinCommands {
  constructor(private readonly paginationService: NecordPaginationService) {}

  @Button('game-join')
  @SlashCommand({ name: 'game-join', description: 'Join Game' })
  public async onGameJoin(
    @Context() [interaction]: SlashCommandContext | ButtonContext,
  ) {
    try {
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
    } catch (error) {
      console.error('Error in game-join command:', error);
      return interaction.reply({
        content: 'เกิดข้อผิดพลาดในการเข้าร่วมเกม กรุณาลองใหม่อีกครั้ง',
        ephemeral: true,
      });
    }
  }
}
