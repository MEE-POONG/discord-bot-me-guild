import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerUpdateRoleCommands } from './server-update-role.commands';
import { ServerUpdateRoleService } from './server-update-role.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [
    PrismaClient,
    ServerRepository,
    ServerUpdateRoleCommands,
    ServerUpdateRoleService,
  ],
})
export class ServerUpdateRoleModule { }
