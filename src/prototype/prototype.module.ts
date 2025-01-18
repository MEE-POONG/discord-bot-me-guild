import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrototypeCommands } from './prototype.commands';
import { PrototypeService } from './prototype.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [
    PrismaClient,
    ServerRepository,
    PrototypeCommands,
    PrototypeService,
  ],
})
export class PrototypemModule { }
