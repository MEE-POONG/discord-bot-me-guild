import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, VoiceState, ChannelType } from 'discord.js';

@Injectable()
export class StageChannelCleanupService implements OnModuleInit {
  constructor(private readonly client: Client) {}

  onModuleInit() {
    this.client.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
      // ตรวจสอบเฉพาะ channel ที่เป็น Stage
      const channel = oldState.channel;

      if (channel && channel.type === ChannelType.GuildStageVoice && channel.members.size === 0) {
        // ลบ channel ถ้าไม่มีสมาชิกเหลืออยู่
        await channel.delete('Auto-delete: No one left in stage channel');
      }
    });
  }
}
