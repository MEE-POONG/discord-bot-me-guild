import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ServerClearCommands } from './server-clear.commands';
import { ServerClearService } from './server-clear.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [PrismaService, ServerRepository, ServerClearCommands, ServerClearService],
})
export class ServerClearModule {}
