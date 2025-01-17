import { Injectable, Logger } from '@nestjs/common';
import { Context, On, Once, ContextOf } from 'necord';
import { VoiceState } from 'discord.js';

@Injectable()
export class AppUpdate {
  private readonly logger = new Logger(AppUpdate.name);

  public constructor() {}

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
  public async removeVoiceChannel(
    @Context() [oldState, newState]: [VoiceState, VoiceState],
  ) {
    if (oldState.channelId === newState.channelId) {
      return;
    }

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
