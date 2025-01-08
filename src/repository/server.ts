import { PrismaService } from 'src/prisma.service';
import { Injectable } from '@nestjs/common';
import { ServerDB } from '@prisma/client';

export type ServerRepositoryType = {
  registerServer(
    serverId: string,
    serverName: string,
    ownerId: string,
    openBot: boolean
  ): Promise<ServerDB>;

  getServerById(serverId: string): Promise<ServerDB | null>;

  updateServer(
    serverId: string,
    data: Partial<Omit<ServerDB, 'id' | 'createdAt' | 'registeredAt'>>
  ): Promise<ServerDB>;

  deleteServer(serverId: string): Promise<ServerDB>;
};

@Injectable()
export class ServerRepository implements ServerRepositoryType {
  constructor(private readonly prismaService: PrismaService) { }

  async registerServer(
    serverId: string,
    serverName: string,
    ownerId: string,
    openBot: boolean
  ): Promise<ServerDB> {
    const now = new Date();
    return this.prismaService.serverDB.create({
      data: {
        serverId,
        serverName,
        ownerId,
        openBot,
        createdAt: now,
        registeredAt: now,
        updatedAt: now,
      },
    });
  }

  async getServerById(serverId: string): Promise<ServerDB | null> {
    return this.prismaService.serverDB.findUnique({
      where: { serverId },
    });
  }

  async updateServer(
    serverId: string,
    data: Partial<Omit<ServerDB, 'id' | 'createdAt' | 'registeredAt'>>
  ): Promise<ServerDB> {
    return this.prismaService.serverDB.update({
      where: { serverId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteServer(serverId: string): Promise<ServerDB> {
    return this.prismaService.serverDB.delete({
      where: { serverId },
    });
  }
}
