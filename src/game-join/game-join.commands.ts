import { Injectable } from '@nestjs/common';
import { GameJoinService } from './game-join.service';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
@Injectable()
export class GameJoinCommands {
  constructor(private readonly gameJoinService: GameJoinService) {}

  @SlashCommand({ name: 'game-join', description: 'Join Game' })
  public async onGameJoin(@Context() [interaction]: SlashCommandContext) {
    return this.gameJoinService.onGameJoin(interaction);
  }
}
