import { Module } from '@nestjs/common';
import { RegisterServerService } from './register-server.service';
import { RegisterServerCommands } from './register-server.commands';
// import { GameTypeRepository } from 'src/game-type/game-type.repository';
// import { GameRepository } from 'src/game/game.repository';
// import { GameRankRepository } from 'src/game-rank/game-rank.repository';
// import { GameConditionMatchRepository } from 'src/game-condition-match/game-condition-match.repository';

@Module({
  providers: [
    RegisterServerService,
    RegisterServerCommands,
    // GameTypeRepository,
    // GameRepository,
    // GameRankRepository,
    // GameConditionMatchRepository,
  ],
})
export class RegisterServermModule { }
