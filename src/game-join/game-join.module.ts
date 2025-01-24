import { Module } from '@nestjs/common';
import { GameJoinService } from './game-join.service';
import { GameJoinCommands } from './game-join.commands';
@Module({
  providers: [GameJoinService, GameJoinCommands],
})
export class GameJoinModule {}
