import { PrismaService } from 'src/prisma.service';
import { Injectable } from '@nestjs/common';
import { ServerDB, ServerMasterDB } from '@prisma/client';

export type ServerRepositoryType = {
  ServerRegister(
    serverId: string,
    serverName: string,
    ownerId: string
  ): Promise<ServerDB>;

  ServerMasterRegister(
    serverId: string,
    serverName: string,
    ownerId: string
  ): Promise<ServerMasterDB>;

  getServerById(serverId: string): Promise<ServerDB | null>;

  updateServer(
    serverId: string,
    data: Partial<Omit<ServerDB, 'id' | 'createdAt' | 'registeredAt'>>
  ): Promise<ServerDB>;

  deleteServer(serverId: string): Promise<ServerDB>;
  ServerMasterRegister(
    serverId: string,
    serverName: string,
    ownerId: string,
  ): Promise<ServerMasterDB>;

  getServerMasterById(serverId: string): Promise<ServerMasterDB | null>;

  updateServerMaster(
    serverId: string,
    data: Partial<Omit<ServerMasterDB, 'id' | 'createdAt'>>,
  ): Promise<ServerMasterDB>;

  deleteServerMaster(serverId: string): Promise<ServerMasterDB>;
};

@Injectable()
export class ServerRepository implements ServerRepositoryType {
  constructor(private readonly prismaService: PrismaService) { }

  async ServerRegister(
    serverId: string,
    serverName: string,
    ownerId: string,
  ): Promise<ServerDB> {
    const now = new Date();
    const serverSuccessfully = await this.prismaService.serverDB.create({
      data: {
        serverId,
        serverName,
        ownerId,
        createdAt: now,
        openUntilAt: now,
        updatedAt: now,
      },
    });
    return serverSuccessfully; // คืนข้อมูลเซิร์ฟเวอร์ที่เพิ่งลงทะเบียนกลับมา
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
  async ServerMasterRegister(
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

  async getServerMasterById(serverId: string): Promise<ServerMasterDB | null> {
    return this.prismaService.serverMasterDB.findUnique({
      where: { serverId },
    });
  }

  async updateServerMaster(
    serverId: string,
    data: Partial<Omit<ServerMasterDB, 'id' | 'createdAt'>>,
  ): Promise<ServerMasterDB> {
    return this.prismaService.serverMasterDB.update({
      where: { serverId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteServerMaster(serverId: string): Promise<ServerMasterDB> {
    return this.prismaService.serverMasterDB.delete({
      where: { serverId },
    });
  }

}
