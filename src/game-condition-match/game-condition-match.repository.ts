import { PrismaService } from 'src/prisma.service';
import { GameConditionMatchDB } from '@prisma/client';
import { Injectable } from '@nestjs/common';
export type GameConditionMatchRepositoryType = {
  getGamesConditionMatchByGameId(
    gameId: string,
    rankNumber: number,
  ): Promise<GameConditionMatchDB[]>;
  getGamesConditionMatchById(id: string): Promise<GameConditionMatchDB>;
};

@Injectable()
export class GameConditionMatchRepository
  implements GameConditionMatchRepositoryType {
  constructor(private readonly prismaService: PrismaService) { }

  async getGamesConditionMatchByGameId(
    gameId: string,
    rankNumber: number,
  ): Promise<GameConditionMatchDB[]> {
    return this.prismaService.gameConditionMatchDB.findMany({
      where: {
        gameId
      },
    });
  }

  async getGamesConditionMatchById(id: string): Promise<GameConditionMatchDB> {
    return this.prismaService.gameConditionMatchDB.findUnique({
      where: {
        id,
      },
    });
  }
}
