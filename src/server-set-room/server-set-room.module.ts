import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ServerSetRoomCommands } from './server-set-room.commands';
import { ServerSetRoomService } from './server-set-room.service';
import { ServerRepository } from 'src/repository/server';
import { StageChannelService } from 'src/stage-channel/stage-channel.service';

@Module({
  providers: [
    PrismaService,
    ServerRepository,
    ServerSetRoomCommands,
    ServerSetRoomService,
    StageChannelService,
  ],
})
export class ServerSetRoomModule {}
