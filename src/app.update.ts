import { Injectable, Logger } from '@nestjs/common';
import { Context, On, Once, ContextOf } from 'necord';
import { VoiceState } from 'discord.js';
import { VoiceTimeService } from './voice-time/voice-time.service';

@Injectable()
export class AppUpdate {
  private readonly logger = new Logger(AppUpdate.name);

  constructor(private readonly voiceTimeService: VoiceTimeService) {}

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`app.update Bot logged in as ${client.user.username}`);
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
  public async handleVoiceState(
    @Context() [oldState, newState]: [VoiceState, VoiceState],
  ) {
    const userId = newState.member.id;

    if (!oldState.channelId && newState.channelId) {
      this.voiceTimeService.startTracking(userId);
    }

    if (oldState.channelId && !newState.channelId) {
      const duration = this.voiceTimeService.stopTracking(userId);

      if (duration) {
        await this.voiceTimeService.createVoiceTime({
          userId,
          channelId: oldState.channelId,
          duration,
          timestamp: new Date(),
        });
      }
      await this.voiceTimeService.deleteVoiceTime(userId);
    }

    if (
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {
      const duration = this.voiceTimeService.stopTracking(userId);

      if (duration) {
        await this.voiceTimeService.createVoiceTime({
          userId,
          channelId: oldState.channelId,
          duration,
          timestamp: new Date(),
        });

        this.voiceTimeService.resetTracking(userId);
      }
    }

    if (oldState.channelId !== newState.channelId) {
      if (oldState.channel && oldState.channel.members.size === 0) {
        if (
          oldState.channel.name.includes('🎮') &&
          oldState.channel.name.includes('PARTY')
        ) {
          await oldState.channel.delete();
        }
      }
    }
  }
}
