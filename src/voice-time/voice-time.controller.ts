import { Controller, Get, Param, Query } from '@nestjs/common';
import { VoiceTimeService } from './voice-time.service';

@Controller('voice-time')
export class VoiceTimeController {
  constructor(private readonly voiceTimeService: VoiceTimeService) {}

  // ดึงเวลารวมทั้งหมดของผู้ใช้
  @Get(':userId/total')
  async getTotalTime(@Param('userId') userId: string) {
    const totalSeconds = await this.voiceTimeService.getTotalVoiceTime(userId);
    return {
      userId,
      totalSeconds,
      formattedDuration: this.voiceTimeService.formatDuration(totalSeconds),
    };
  }

  // ดึงเวลารวมในช่วงเวลา
  @Get(':userId/range')
  async getTimeRange(
    @Param('userId') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const totalSeconds = await this.voiceTimeService.getVoiceTimeInRange(
      userId,
      startDate,
      endDate,
    );

    return {
      userId,
      startDate,
      endDate,
      totalSeconds,
      formattedDuration: this.voiceTimeService.formatDuration(totalSeconds),
    };
  }

  // ดึงเวลาแยกตาม channel
  @Get(':userId/channels')
  async getTimeByChannel(@Param('userId') userId: string) {
    const channelTimes = await this.voiceTimeService.getVoiceTimeByChannel(userId);
    return channelTimes.map((ct) => ({
      ...ct,
      formattedDuration: this.voiceTimeService.formatDuration(ct.totalDuration),
    }));
  }
}
