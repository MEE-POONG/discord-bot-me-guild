import { PrismaService } from 'src/prisma.service';
import { GameOnlineDB } from '@prisma/client';
import { Injectable } from '@nestjs/common';
export type GameRepositoryType = {
  getGamesByType(
    typeId: string,
    page: number,
    itemsPerPage: number,
  ): Promise<{
    data: GameOnlineDB[];
    total: number;
    page: number;
    limit: number;
  }>;
  getGameById(gameUid: string): Promise<GameOnlineDB>;
};

@Injectable()
export class GameRepository implements GameRepositoryType {
  constructor(private readonly prismaService: PrismaService) {}

  async getGamesByType(
    typeId: string,
    page: number,
    itemsPerPage: number,
  ): Promise<{
    data: GameOnlineDB[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * itemsPerPage;

    const data = await this.prismaService.gameOnlineDB.findMany({
      where: {
        id: {
          in: await this.prismaService.gameTypeGame
            .findMany({
              where: { typeId },
              select: { gameId: true },
            })
            .then((results) => results.map((result) => result.gameId)),
        },
      },
      skip,
      take: itemsPerPage,
    });

    const totalItems = await this.prismaService.gameOnlineDB.count({
      where: {
        id: {
          in: await this.prismaService.gameTypeGame
            .findMany({
              where: { typeId },
              select: { gameId: true },
            })
            .then((results) => results.map((result) => result.gameId)),
        },
      },
    });

    return {
      data,
      total: totalItems,
      page,
      limit: itemsPerPage,
    };
  }

  async getGameById(gameUid: string): Promise<GameOnlineDB> {
    return this.prismaService.gameOnlineDB.findUnique({
      where: { id: gameUid },
    });
  }
}
