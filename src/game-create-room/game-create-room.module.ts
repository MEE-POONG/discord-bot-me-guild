import { Module } from '@nestjs/common';
import { GameCreateRoomService } from './game-create-room.service';
import { GameCreateRoomCommands } from './game-create-room.commands';

@Module({
  providers: [GameCreateRoomService, GameCreateRoomCommands],
})
export class GameCreateRoomModule {}
