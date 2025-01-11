import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerRoleCommands } from './server-role.commands';
import { ServerRoleService } from './server-role.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [
    PrismaClient,
    ServerRepository,
    ServerRoleCommands,
    ServerRoleService,
  ],
})
export class ServerRolemModule { }
