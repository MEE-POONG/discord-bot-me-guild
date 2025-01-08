import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrototypeCommands } from './prototype.commands';
import { PrototypeService } from './prototype.service';

@Module({
  providers: [
    PrismaClient,
    PrototypeCommands,
    PrototypeService,
  ],
})
export class PrototypemModule { }
