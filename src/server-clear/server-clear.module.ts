import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerclearCommands } from './server-clear.commands';
import { ServerclearService } from './server-clear.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [
    PrismaClient,
    ServerRepository,
    ServerclearCommands,
    ServerclearService,
  ],
})
export class ServerClearModule { }
