import { Module } from '@nestjs/common';
import { GameTypeService } from './game-type.service';
import { GameTypeRepository } from './game-type.repository';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [GameTypeService, GameTypeRepository, PrismaService],
  exports: [GameTypeRepository],
})
export class GameTypeModule {}
