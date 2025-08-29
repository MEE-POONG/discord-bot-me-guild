import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ServerclearCommands } from './server-clear.commands';
import { ServerclearService } from './server-clear.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [PrismaService, ServerRepository, ServerclearCommands, ServerclearService],
})
export class ServerClearModule {}
