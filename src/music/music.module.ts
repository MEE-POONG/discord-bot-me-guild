import { Module } from '@nestjs/common';
import { MusicService } from './music.service';
import { MusicCommands } from './music.commands';
import { PlayerService } from './player.service';
import { UiService } from './ui.service';
import { MusicControls } from './music.controls';

@Module({
  providers: [MusicService, MusicCommands, PlayerService, UiService, MusicControls],
  exports: [MusicService, PlayerService, UiService, MusicControls],
})
export class MusicModule {}
