import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerSetRoomCommands } from './server-set-room.commands';
import { ServerSetRoomService } from './server-set-room.service';
import { ServerRepository } from 'src/repository/server';
import { StageChannelService } from 'src/stage-channel/stage-channel.service';

@Module({
  providers: [PrismaClient, ServerRepository, ServerSetRoomCommands, ServerSetRoomService, StageChannelService],
})
export class ServerSetRoomModule {}
