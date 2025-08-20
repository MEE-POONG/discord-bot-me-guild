import { Controller, Get, Injectable, Param, Query } from '@nestjs/common';
import { VoiceTimeService } from './voice-time.service';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { VoiceTimeChannelDto, VoiceTimeDto, VoiceTimeRangeDto } from './dto/voice-time.dto';

@Injectable()
export class VoiceTimeCommands {
  constructor(private readonly voiceTimeService: VoiceTimeService) {}

  // ดึงเวลารวมทั้งหมดของผู้ใช้
  @SlashCommand({
    name: 'voice-time-me',
    description: 'ดูเวลาใช้งานใน voice channel',
  })
  async getTotalTimeMe(@Context() [interaction]: SlashCommandContext) {
    const totalSeconds = await this.voiceTimeService.getTotalVoiceTime(interaction.user.id);

    interaction.reply({
      content: `เวลาใช้งานใน voice channel: ${this.voiceTimeService.formatDuration(totalSeconds)}`,
      ephemeral: true,
    });
  }

  // ดึงเวลารวมทั้งหมดของผู้ใช้
  @SlashCommand({
    name: 'voice-time',
    description: 'ดูเวลาใช้งานใน voice channel',
  })
  async getTotalTime(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: VoiceTimeDto,
  ) {
    const totalSeconds = await this.voiceTimeService.getTotalVoiceTime(options.member.id);

    interaction.reply({
      content: `เวลาใช้งานใน voice channel: ${this.voiceTimeService.formatDuration(totalSeconds)}`,
      ephemeral: true,
    });
  }

  // ดึงเวลารวมในช่วงเวลา
  @SlashCommand({
    name: 'voice-time-range',
    description: 'ดูเวลาใช้งานใน voice channel ในช่วงเวลาที่กำหนด',
  })
  async getTimeRange(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: VoiceTimeRangeDto,
  ) {
    const startDate = new Date(options.start);
    const endDate = new Date(options.end);

    const totalSeconds = await this.voiceTimeService.getVoiceTimeInRange(
      options.member.id,
      startDate,
      endDate,
    );

    interaction.reply({
      content: `เวลาใช้งานใน voice channel ในช่วงเวลาที่กำหนด: ${this.voiceTimeService.formatDuration(totalSeconds)}`,
      ephemeral: true,
    });
  }

  // ดึงเวลาแยกตาม channel
  @SlashCommand({
    name: 'voice-time-channel',
    description: 'ดูเวลาใช้งานใน voice channel แยกตาม channel',
  })
  async getTimeByChannel(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: VoiceTimeChannelDto,
  ) {
    const channelTimes = await this.voiceTimeService.getVoiceTimeByChannel(options.member.id);
    interaction.reply({
      content: `เวลาใช้งานใน voice channel แยกตาม channel: ${channelTimes
        .map((ct) => ({
          ...ct,
          formattedDuration: this.voiceTimeService.formatDuration(ct.totalDuration),
        }))
        .join('\n')}`,
      ephemeral: true,
    });
  }
}
