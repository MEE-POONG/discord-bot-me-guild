import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ServerclearCommands } from './server-clear.commands';
import { ServerClearService } from './server-clear.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [PrismaService, ServerRepository, ServerclearCommands, ServerClearService],
})
export class ServerClearModule {}
