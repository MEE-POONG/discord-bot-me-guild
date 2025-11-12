import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerMeguildSetCommands } from './server-meguild-set.commands';
import { ServerMeguildSetService } from './server-meguild-set.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [PrismaClient, ServerRepository, ServerMeguildSetCommands, ServerMeguildSetService],
})
export class ServerMeguildSetModule {}
