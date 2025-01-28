import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerclearRoleCommands } from './server-clear-role.commands';
import { ServerclearRoleService } from './server-clear-role.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [
    PrismaClient,
    ServerRepository,
    ServerclearRoleCommands,
    ServerclearRoleService,
  ],
})
export class ServerclearRoleModule { }
