import { Module } from '@nestjs/common';
import { GameJoinService } from './game-join.service';
import { GameJoinCommands } from './game-join.commands';
import { GameTypeRepository } from 'src/game-type/game-type.repository';
import { GameRepository } from 'src/game/game.repository';

@Module({
  providers: [
    GameJoinService,
    GameJoinCommands,
    GameTypeRepository,
    GameRepository,
  ],
})
export class GameJoinModule {}

