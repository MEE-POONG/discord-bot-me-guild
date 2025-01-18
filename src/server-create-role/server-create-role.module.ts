import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerCreateRoleCommands } from './server-create-role.commands';
import { ServerCreateRoleService } from './server-create-role.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [
    PrismaClient,
    ServerRepository,
    ServerCreateRoleCommands,
    ServerCreateRoleService,
  ],
})
export class ServerCreateRolemModule { }
