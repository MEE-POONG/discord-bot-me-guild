import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerClearCommands } from './server-clear.commands';
import { ServerClearService } from './server-clear.service';
import { ServerRepository } from 'src/repository/server';
import { ServerMeguildSetService } from '@/server-meguild-set/server-meguild-set.service';

@Module({
  providers: [PrismaClient, ServerRepository, ServerClearCommands, ServerClearService, ServerMeguildSetService],
})
export class ServerClearModule { }
