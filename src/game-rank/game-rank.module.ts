import { Module } from '@nestjs/common';
import { GameRankService } from './game-rank.service';
import { GameRankRepository } from './game-rank.repository';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [GameRankService, GameRankRepository, PrismaService],
  exports: [GameRankRepository],
})
export class GameRankModule {}
