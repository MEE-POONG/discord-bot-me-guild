import { Injectable } from '@nestjs/common';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors } from 'discord.js';
import { Track } from 'discord-player';

@Injectable()
export class UiService {
  createNowPlayingEmbed(track: Track, progress?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setTitle('🎵 กำลังเล่น')
      .setDescription(`**${track.title}**`)
      .addFields(
        { name: '👤 ศิลปิน', value: track.author || 'ไม่ระบุ', inline: true },
        { name: '⏱️ ระยะเวลา', value: track.duration || 'ไม่ระบุ', inline: true },
        { name: '📺 แหล่งที่มา', value: 'YouTube', inline: true }
      )
      .setThumbnail(track.thumbnail || 'https://i.imgur.com/placeholder.png')
      .setFooter({ text: '🎶 Music Bot • สนุกกับการฟังเพลง' })
      .setTimestamp();

    if (progress) {
      embed.addFields({ name: '📊 ความคืบหน้า', value: progress, inline: false });
    }

    return embed;
  }

  createQueueEmbed(tracks: Track[], currentIndex: number = 0): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle('📋 คิวเพลง')
      .setDescription(`กำลังแสดง ${Math.min(tracks.length, 10)} จาก ${tracks.length} เพลง`)
      .setFooter({ text: '🎶 Music Bot • คิวเพลง' })
      .setTimestamp();

    const queueList = tracks.slice(0, 10).map((track, index) => {
      const isCurrent = index === currentIndex;
      const prefix = isCurrent ? '🎵' : `${index + 1}.`;
      const duration = track.duration || 'ไม่ระบุ';
      return `${prefix} **${track.title}** - ${track.author} \`${duration}\``;
    }).join('\n');

    embed.addFields({ name: '🎼 รายการเพลง', value: queueList || 'ไม่มีเพลงในคิว', inline: false });

    return embed;
  }

  createSearchResultEmbed(track: Track, isRandom: boolean = false): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(isRandom ? Colors.Purple : Colors.Blue)
      .setTitle(isRandom ? '🎲 สุ่มเพลงให้แล้ว!' : '🎵 เพิ่มเพลงเข้าคิวแล้ว')
      .setDescription(`**${track.title}**`)
      .addFields(
        { name: '👤 ศิลปิน', value: track.author || 'ไม่ระบุ', inline: true },
        { name: '⏱️ ระยะเวลา', value: track.duration || 'ไม่ระบุ', inline: true },
        { name: '📺 แหล่งที่มา', value: 'YouTube', inline: true }
      )
      .setThumbnail(track.thumbnail || 'https://i.imgur.com/placeholder.png')
      .setFooter({ text: isRandom ? '🎲 สุ่มเพลง • Music Bot' : '🎵 เพิ่มเพลง • Music Bot' })
      .setTimestamp();

    return embed;
  }

  createErrorEmbed(message: string, isFallback: boolean = false): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(isFallback ? Colors.Orange : Colors.Red)
      .setTitle(isFallback ? '⚠️ ใช้ระบบสำรอง' : '❌ เกิดข้อผิดพลาด')
      .setDescription(message)
      .setFooter({ text: '🎶 Music Bot • ระบบจัดการข้อผิดพลาด' })
      .setTimestamp();

    return embed;
  }

  createSuccessEmbed(message: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle('✅ สำเร็จ')
      .setDescription(message)
      .setFooter({ text: '🎶 Music Bot • การดำเนินการสำเร็จ' })
      .setTimestamp();

    return embed;
  }

  createMusicControlButtons(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('music_previous')
          .setEmoji('⏮️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('music_pause')
          .setEmoji('⏸️')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('music_skip')
          .setEmoji('⏭️')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_stop')
          .setEmoji('⏹️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('music_queue')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Secondary)
      );
  }

  createVolumeControlButtons(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('volume_down')
          .setEmoji('🔉')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('volume_mute')
          .setEmoji('🔇')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('volume_up')
          .setEmoji('🔊')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('volume_50')
          .setLabel('50%')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('volume_100')
          .setLabel('100%')
          .setStyle(ButtonStyle.Secondary)
      );
  }

  createProgressBar(current: number, total: number, length: number = 20): string {
    const percentage = Math.min(100, Math.max(0, (current / total) * 100));
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const timeCurrent = this.formatTime(current);
    const timeTotal = this.formatTime(total);
    
    return `\`${timeCurrent}\` ${bar} \`${timeTotal}\` \`${percentage.toFixed(1)}%\``;
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  createWelcomeEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setTitle('🎵 ยินดีต้อนรับสู่ Music Bot')
      .setDescription('บอทเพลงที่ทันสมัยและใช้งานง่าย พร้อมฟีเจอร์ครบครัน!')
      .addFields(
        { name: '🎮 คำสั่งหลัก', value: '`/play` - เล่นเพลง\n`/random` - สุ่มเพลง\n`/queue` - ดูคิว', inline: true },
        { name: '🎛️ การควบคุม', value: '`/pause` - หยุด/เล่น\n`/skip` - ข้าม\n`/stop` - หยุด', inline: true },
        { name: '🔧 การตั้งค่า', value: '`/volume` - ระดับเสียง\n`/nowplaying` - ดูเพลงปัจจุบัน', inline: true }
      )
      .setThumbnail('https://i.imgur.com/music-bot-icon.png')
      .setFooter({ text: '🎶 Music Bot • พร้อมให้บริการ' })
      .setTimestamp();
  }
}
