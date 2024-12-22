import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { NecordPaginationService } from '@necord/pagination';

@Injectable()
export class GameCreateRoomCommands {
  public constructor(
    private readonly paginationService: NecordPaginationService,
  ) {}

  @SlashCommand({ name: 'game-create-room', description: 'สร้างห้องเกมส์' })
  public async onGameCreateRoom(@Context() [interaction]: SlashCommandContext) {
    const pagination = this.paginationService.get('game_create_room');
    const page = await pagination.build();

    return interaction.reply({ ...page, ephemeral: true });
  }
}
