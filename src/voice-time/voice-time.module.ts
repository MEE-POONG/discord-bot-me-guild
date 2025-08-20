import { Module } from '@nestjs/common';
import { VoiceTimeService } from './voice-time.service';
import { PrismaService } from '../prisma.service';
import { VoiceTimeCommands } from './voice-time.commands';
import { VoiceTimeController } from './voice-time.controller';

@Module({
  providers: [VoiceTimeController, VoiceTimeCommands, VoiceTimeService, PrismaService],
  exports: [VoiceTimeService],
})
export class VoiceTimeModule {}
