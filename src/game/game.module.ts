import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameRepository } from './game.repository';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [GameService, GameRepository, PrismaService],
  exports: [GameRepository],
})
export class GameModule {}
