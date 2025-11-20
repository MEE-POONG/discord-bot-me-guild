import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerClearCommands } from './server-clear.commands';
import { ServerClearService } from './server-clear.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [PrismaClient, ServerRepository, ServerClearCommands, ServerClearService],
})
export class ServerClearModule {}
