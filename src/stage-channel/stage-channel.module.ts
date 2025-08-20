import { Module } from '@nestjs/common';
import { StageChannelCommands } from './stage-channel.commands';
import { StageChannelService } from './stage-channel.service';
import { StageChannelCleanupService } from './stage-channel-cleanup.service';

@Module({
  providers: [StageChannelService, StageChannelCommands, StageChannelCleanupService],
})
export class StageChannelModule {}
