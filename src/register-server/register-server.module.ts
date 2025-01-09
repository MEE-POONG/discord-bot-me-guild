import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RegisterServerCommands } from './register-server.commands';
import { RegisterServerService } from './register-server.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [
    PrismaClient,
    ServerRepository,
    RegisterServerCommands,
    RegisterServerService,
  ],
})
export class RegisterServermModule { }
