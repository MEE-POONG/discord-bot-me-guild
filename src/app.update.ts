import { Injectable, Logger } from '@nestjs/common';
import { Context, On, Once, ContextOf } from 'necord';
import { VoiceState } from 'discord.js';
import { VoiceTimeService } from './voice-time/voice-time.service';
import { PlayerService } from './music/player.service';

@Injectable()
export class AppUpdate {
  private readonly logger = new Logger(AppUpdate.name);
  private voiceTimeTracker = new Map<string, number>();

  constructor(
    private readonly voiceTimeService: VoiceTimeService,
    private readonly playerService: PlayerService,
  ) {}

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`app.update Bot logged in as ${client.user.username}`);
    
    // Initialize the music player
    this.playerService.initializePlayer(client);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  @On('error')
  public onError(@Context() [error]: ContextOf<'error'>) {
    this.logger.error(error);
  }

  @On('voiceStateUpdate')
  public async handleVoiceState(@Context() [oldState, newState]: [VoiceState, VoiceState]) {
    const userId = newState.member.id;

    if (!oldState.channelId && newState.channelId) {
      this.voiceTimeTracker.set(userId, Date.now());
    }

    if (oldState.channelId && !newState.channelId) {
      const startTime = this.voiceTimeTracker.get(userId);

      if (startTime) {
        const duration = Math.floor((Date.now() - startTime) / 1000);

        await this.voiceTimeService.createVoiceTime({
          userId,
          channelId: oldState.channelId,
          duration,
          timestamp: new Date(),
        });

        this.voiceTimeTracker.delete(userId);
      }
    }

    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const startTime = this.voiceTimeTracker.get(userId);

      if (startTime) {
        const duration = Math.floor((Date.now() - startTime) / 1000);

        await this.voiceTimeService.createVoiceTime({
          userId,
          channelId: oldState.channelId,
          duration,
          timestamp: new Date(),
        });

        this.voiceTimeTracker.set(userId, Date.now());
      }
    }

    if (oldState.channelId !== newState.channelId) {
      if (oldState.channel && oldState.channel.members.size === 0) {
        if (oldState.channel.name.includes('🎮') && oldState.channel.name.includes('RMG')) {
          await oldState.channel.delete();
        }
      }
    }
  }
}
