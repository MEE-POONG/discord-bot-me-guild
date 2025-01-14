import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerSetRoomCommands } from './server-set-room.commands';
import { ServerSetRoomService } from './server-set-room.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [
    PrismaClient,
    ServerRepository,
    ServerSetRoomCommands,
    ServerSetRoomService,
  ],
})
export class ServerSetRoommModule { }
