import { Module } from '@nestjs/common';
import { GameCreateRoomService } from './game-create-room.service';
import { GameCreateRoomCommands } from './game-create-room.commands';
import { GameTypeRepository } from 'src/game-type/game-type.repository';
import { GameRepository } from 'src/game/game.repository';
import { GameRankRepository } from 'src/game-rank/game-rank.repository';
import { GameConditionMatchRepository } from 'src/game-condition-match/game-condition-match.repository';

@Module({
  providers: [
    GameCreateRoomService,
    GameCreateRoomCommands,
    GameTypeRepository,
    GameRepository,
    GameRankRepository,
    GameConditionMatchRepository,
  ],
})
export class GameCreateRoomModule {}
