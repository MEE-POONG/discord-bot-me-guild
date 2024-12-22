import { Module } from '@nestjs/common';
import { GameConditionMatchService } from './game-condition-match.service';
import { GameConditionMatchRepository } from './game-condition-match.repository';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [
    GameConditionMatchService,
    GameConditionMatchRepository,
    PrismaService,
  ],
  exports: [GameConditionMatchRepository],
})
export class GameConditionMatchModule {}
