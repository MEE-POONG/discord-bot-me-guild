import { GuildMember } from 'discord.js';
import { StringOption, UserOption } from 'necord';

export class VoiceTimeDto {
  @UserOption({
    name: 'voice-time',
    description: 'ดูเวลาใช้งานใน voice channel',
    required: true,
  })
  member: GuildMember;
}

export class VoiceTimeRangeDto {
  @UserOption({
    name: 'voice-time',
    description: 'ดูเวลาใช้งานใน voice channel',
    required: true,
  })
  member: GuildMember;

  @StringOption({
    name: 'start',
    description: 'วันที่เริ่มต้น',
    required: true,
  })
  start: string;

  @StringOption({
    name: 'end',
    description: 'วันที่สิ้นสุด',
    required: true,
  })
  end: string;
}

export class VoiceTimeChannelDto {
  @UserOption({
    name: 'voice-time-channel',
    description: 'ดูเวลาใช้งานใน voice channel',
    required: true,
  })
  member: GuildMember;
}