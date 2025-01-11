import { PrismaService } from 'src/prisma.service';
import { Injectable } from '@nestjs/common';
import { ServerMasterDB } from '@prisma/client';

export type ServerMasterRepositoryType = {
  ServerRegister(
    serverId: string,
    serverName: string,
    ownerId: string,
  ): Promise<ServerMasterDB>;

  getServerById(serverId: string): Promise<ServerMasterDB | null>;

  updateServer(
    serverId: string,
    data: Partial<Omit<ServerMasterDB, 'id' | 'createdAt'>>,
  ): Promise<ServerMasterDB>;

  deleteServer(serverId: string): Promise<ServerMasterDB>;
};

@Injectable()
export class ServerMasterRepository implements ServerMasterRepositoryType {
  constructor(private readonly prismaService: PrismaService) {}

  async ServerRegister(
    serverId: string,
    serverName: string,
    ownerId: string,
  ): Promise<ServerMasterDB> {
    const now = new Date();
    const serverSuccessfully = await this.prismaService.serverMasterDB.create({
      data: {
        serverId,
        serverName,
        ownerId,
        createdAt: now,
        updatedAt: now,
      },
    });
    return serverSuccessfully; // Returns the newly registered server
  }

  async getServerById(serverId: string): Promise<ServerMasterDB | null> {
    return this.prismaService.serverMasterDB.findUnique({
      where: { serverId },
    });
  }

  async updateServer(
    serverId: string,
    data: Partial<Omit<ServerMasterDB, 'id' | 'createdAt'>>,
  ): Promise<ServerMasterDB> {
    return this.prismaService.serverMasterDB.update({
      where: { serverId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteServer(serverId: string): Promise<ServerMasterDB> {
    return this.prismaService.serverMasterDB.delete({
      where: { serverId },
    });
  }
}
