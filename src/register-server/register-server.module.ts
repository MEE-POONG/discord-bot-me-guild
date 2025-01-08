import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RegisterServerCommands } from './register-server.commands';
import { RegisterServerService } from './register-server.service';

@Module({
  providers: [
    PrismaClient,
    RegisterServerCommands,
    RegisterServerService,
  ],
})
export class RegisterServermModule { }
