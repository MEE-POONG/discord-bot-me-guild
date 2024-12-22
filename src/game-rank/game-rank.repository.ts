import { PrismaService } from 'src/prisma.service';
import { GameRankDB } from '@prisma/client';
import { Injectable } from '@nestjs/common';
export type GameRankRepositoryType = {
  getGamesRank(gameId: string): Promise<GameRankDB[]>;
  getGamesRankByID(id: string): Promise<GameRankDB>;
};

@Injectable()
export class GameRankRepository implements GameRankRepositoryType {
  constructor(private readonly prismaService: PrismaService) { }

  async getGamesRank(gameId: string): Promise<GameRankDB[]> {
    return await this.prismaService.gameRankDB.findMany({
      where: {
        gameId,
      },
      orderBy: {
        number: `asc`
      }
    });
  }
  async getGamesRankByID(id: string): Promise<GameRankDB> {
    return await this.prismaService.gameRankDB.findUnique({
      where: {
        id,
      },

    });
  }
}
