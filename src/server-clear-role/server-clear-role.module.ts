import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerClearRoleCommands } from './server-clear-role.commands';
import { ServerClearRoleService } from './server-clear-role.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [PrismaClient, ServerRepository, ServerClearRoleCommands, ServerClearRoleService],
})
export class ServerClearRoleModule {}
