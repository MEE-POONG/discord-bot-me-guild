import { Injectable, Logger } from '@nestjs/common';
import { Button, ButtonContext, Context } from 'necord';
import { PlayerService } from './player.service';
import { UiService } from './ui.service';

@Injectable()
export class MusicControls {
  private readonly logger = new Logger(MusicControls.name);

  constructor(
    private readonly playerService: PlayerService,
    private readonly ui: UiService,
  ) {}

  private get queue() {
    const player = this.playerService.getPlayer();
    // ButtonContext[0] provides Interaction; guild is available per-handler
    return player;
  }

  // Helper to get queue for a guild
  private getGuildQueue(guildId: string) {
    const player = this.playerService.getPlayer();
    return player?.nodes.get(guildId);
  }

  @Button('music_pause')
  public async onPause(@Context() [interaction]: ButtonContext) {
    try {
      await interaction.deferUpdate();
      const queue = this.getGuildQueue(interaction.guildId);
      if (!queue || !queue.isPlaying()) return;
      const paused = queue.node.pause();
      this.logger.log(`music_pause: ${paused ? 'paused' : 'resumed'} by ${interaction.user.id}`);
    } catch (e) {
      this.logger.error('onPause failed', e);
    }
  }

  @Button('music_skip')
  public async onSkip(@Context() [interaction]: ButtonContext) {
    try {
      await interaction.deferUpdate();
      const queue = this.getGuildQueue(interaction.guildId);
      if (!queue || !queue.isPlaying()) return;
      queue.node.skip();
      this.logger.log(`music_skip by ${interaction.user.id}`);
    } catch (e) {
      this.logger.error('onSkip failed', e);
    }
  }

  @Button('music_stop')
  public async onStop(@Context() [interaction]: ButtonContext) {
    try {
      await interaction.deferUpdate();
      const queue = this.getGuildQueue(interaction.guildId);
      if (!queue) return;
      queue.delete();
      this.logger.log(`music_stop by ${interaction.user.id}`);
    } catch (e) {
      this.logger.error('onStop failed', e);
    }
  }

  @Button('music_queue')
  public async onQueue(@Context() [interaction]: ButtonContext) {
    try {
      const queue = this.getGuildQueue(interaction.guildId);
      if (!queue || queue.tracks.size === 0) {
        return interaction.reply({ content: '❌ ไม่มีเพลงในคิว', ephemeral: true });
      }
      const tracks = queue.tracks.toArray();
      const embed = this.ui.createQueueEmbed(tracks);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (e) {
      this.logger.error('onQueue failed', e);
      try { await interaction.deferUpdate(); } catch {}
    }
  }

  @Button('volume_down')
  public async onVolumeDown(@Context() [interaction]: ButtonContext) {
    await this.adjustVolume(interaction, -10);
  }

  @Button('volume_up')
  public async onVolumeUp(@Context() [interaction]: ButtonContext) {
    await this.adjustVolume(interaction, +10);
  }

  @Button('volume_mute')
  public async onVolumeMute(@Context() [interaction]: ButtonContext) {
    await this.setVolume(interaction, 0);
  }

  @Button('volume_50')
  public async onVolume50(@Context() [interaction]: ButtonContext) {
    await this.setVolume(interaction, 50);
  }

  @Button('volume_100')
  public async onVolume100(@Context() [interaction]: ButtonContext) {
    await this.setVolume(interaction, 100);
  }

  private async adjustVolume(interaction: any, delta: number) {
    try {
      const queue = this.getGuildQueue(interaction.guildId);
      if (!queue || !queue.isPlaying()) {
        return interaction.reply({ content: '❌ ไม่มีเพลงที่กำลังเล่นอยู่', ephemeral: true });
      }
      const next = Math.max(0, Math.min(100, (queue.node.volume ?? 80) + delta));
      queue.node.setVolume(next);
      return interaction.reply({ content: `🔊 ตั้งเสียงเป็น ${next}%`, ephemeral: true });
    } catch (e) {
      this.logger.error('adjustVolume failed', e);
      try { await interaction.deferUpdate(); } catch {}
    }
  }

  private async setVolume(interaction: any, value: number) {
    try {
      const queue = this.getGuildQueue(interaction.guildId);
      if (!queue || !queue.isPlaying()) {
        return interaction.reply({ content: '❌ ไม่มีเพลงที่กำลังเล่นอยู่', ephemeral: true });
      }
      queue.node.setVolume(value);
      return interaction.reply({ content: `🔊 ตั้งเสียงเป็น ${value}%`, ephemeral: true });
    } catch (e) {
      this.logger.error('setVolume failed', e);
      try { await interaction.deferUpdate(); } catch {}
    }
  }
}

