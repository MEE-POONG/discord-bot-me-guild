import { Injectable } from '@nestjs/common';
import { Button, Context, SlashCommand, SlashCommandContext, ButtonContext } from 'necord';
import { NecordPaginationService } from '@necord/pagination';
import { GuildMember } from 'discord.js';

@Injectable()
export class GameCreateRoomCommands {
  public constructor(
    private readonly paginationService: NecordPaginationService,
  ) {}

  @SlashCommand({ name: 'game-create-room', description: 'สร้างห้องเกมส์' })
  public async onGameCreateRoom(@Context() [interaction]: SlashCommandContext) {
    const pagination = this.paginationService.get('game_create_room');
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
  @Button('game-create-room')
  public async onGameCreateRoomButton(@Context() [interaction]: ButtonContext) {
    console.log('interaction', interaction);
    const pagination = this.paginationService.get('game_create_room');
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
