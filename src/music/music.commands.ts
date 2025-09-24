import { Injectable } from '@nestjs/common';
import { MusicService } from './music.service';
import { SlashCommand, SlashCommandContext, Context, Options } from 'necord';
import { PlayDto, VolumeDto } from './dto';

@Injectable()
export class MusicCommands {
  constructor(private readonly musicService: MusicService) {}

  @SlashCommand({
    name: 'play',
    description: 'เล่นเพลงจาก YouTube (ถ้าไม่ระบุจะสุ่มเพลงให้)',
  })
  async play(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: PlayDto,
  ) {
    await this.musicService.play([interaction], options);
  }

  @SlashCommand({
    name: 'skip',
    description: 'ข้ามเพลงปัจจุบัน',
  })
  async skip(@Context() [interaction]: SlashCommandContext) {
    await this.musicService.skip([interaction]);
  }

  @SlashCommand({
    name: 'stop',
    description: 'หยุดเพลงและออกจากช่องเสียง',
  })
  async stop(@Context() [interaction]: SlashCommandContext) {
    await this.musicService.stop([interaction]);
  }

  @SlashCommand({
    name: 'pause',
    description: 'หยุดชั่วคราวหรือเล่นต่อ',
  })
  async pause(@Context() [interaction]: SlashCommandContext) {
    await this.musicService.pause([interaction]);
  }

  @SlashCommand({
    name: 'queue',
    description: 'แสดงคิวเพลง',
  })
  async queue(@Context() [interaction]: SlashCommandContext) {
    await this.musicService.queue([interaction]);
  }

  @SlashCommand({
    name: 'nowplaying',
    description: 'แสดงเพลงที่กำลังเล่น',
  })
  async nowPlaying(@Context() [interaction]: SlashCommandContext) {
    await this.musicService.nowPlaying([interaction]);
  }

  @SlashCommand({
    name: 'volume',
    description: 'ตั้งระดับเสียง (0-100)',
  })
  async volume(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: VolumeDto,
  ) {
    await this.musicService.volume([interaction], options);
  }

  @SlashCommand({
    name: 'random',
    description: 'สุ่มเพลงยอดนิยมให้เล่น',
  })
  async random(@Context() [interaction]: SlashCommandContext) {
    await this.musicService.playRandom([interaction]);
  }

  @SlashCommand({
    name: 'help',
    description: 'แสดงคำสั่งและวิธีใช้งานบอทเพลง',
  })
  async help(@Context() [interaction]: SlashCommandContext) {
    await this.musicService.showHelp([interaction]);
  }
}
