import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerRegisterCommands } from './server-register.commands';
import { ServerRegisterService } from './server-register.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [PrismaClient, ServerRepository, ServerRegisterCommands, ServerRegisterService],
})
export class ServerRegisterModule {}
