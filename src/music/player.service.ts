import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Player } from 'discord-player';
import { Client } from 'discord.js';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { SpotifyExtractor, SoundCloudExtractor } from '@discord-player/extractor';
import { OpusEncoder } from '@discordjs/opus';
import { generateDependencyReport } from '@discordjs/voice';
import * as crypto from 'node:crypto';

@Injectable()
export class PlayerService implements OnModuleInit {
  private readonly logger = new Logger(PlayerService.name);
  private player: Player;

  constructor() {}

  async onModuleInit() {
    this.logger.log('Initializing Discord Player...');
  }

  initializePlayer(client: Client) {
    // ตั้งค่า FFmpeg path หากยังไม่ได้ตั้งค่า
    if (!process.env.FFMPEG_PATH) {
      try {
        process.env.FFMPEG_PATH = require('ffmpeg-static');
        this.logger.log('FFmpeg path set from ffmpeg-static');
      } catch (error) {
        this.logger.warn('Could not set FFmpeg path from ffmpeg-static:', error.message);
      }
    }

    // ปล่อยให้ไลบรารีต่อรองโหมดเข้ารหัสอัตโนมัติ (AEAD)
    // หมายเหตุ: การตั้งค่า legacy/encryption mode แบบบังคับอาจทำให้เชื่อมต่อไม่ได้

    // Log runtime crypto/encryption support to help diagnose voice AEAD issues
    try {
      const hasAesGcm = crypto.getCiphers().includes('aes-256-gcm');
      this.logger.log(
        `Voice crypto check: aes-256-gcm=${hasAesGcm}, webcrypto=${Boolean(globalThis.crypto && globalThis.crypto.subtle)}`,
      );
      this.logger.debug(generateDependencyReport());
    } catch {}

    // ลด YouTube.js warnings
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('[YOUTUBEJS]') || message.includes('GridShelfView') || message.includes('SectionHeaderView')) {
        // Suppress YouTube.js parser warnings
        return;
      }
      originalConsoleWarn.apply(console, args);
    };

    this.player = new Player(client, {
      ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
        filter: 'audioonly',
      },
      // การตั้งค่าสำหรับ encryption modes ที่เข้ากันได้
      useLegacyFFmpeg: true,
      skipFFmpeg: false,
      // เพิ่มการตั้งค่าเพิ่มเติม
      lagMonitor: 30000,
      connectionTimeout: 20000,
    });

    // เพิ่ม extractors หลายตัวเพื่อความเสถียร
    this.player.extractors.register(YoutubeiExtractor, {});
    
    // เพิ่ม SoundCloud extractor เป็น fallback
    this.player.extractors.register(SoundCloudExtractor, {});

    this.player.events.on('playerStart', (queue, track) => {
      queue.metadata.channel?.send(`🎵 เริ่มเล่น **${track.title}**`);
    });

    this.player.events.on('audioTrackAdd', (queue, track) => {
      queue.metadata.channel?.send(`🎵 เพิ่ม **${track.title}** เข้าคิวแล้ว`);
    });

    this.player.events.on('disconnect', (queue) => {
      queue.metadata.channel?.send('❌ ถูกตัดการเชื่อมต่อจากช่องเสียง');
    });

    this.player.events.on('error', (queue, error) => {
      this.logger.error('Player error:', error);
      
      // ตรวจสอบประเภทของ error
      if (error.message?.includes('Could not extract stream')) {
        queue.metadata.channel?.send('❌ ไม่สามารถดึงสตรีมเพลงได้ ลองเพลงอื่น');
      } else if (error.message?.includes('encryption modes')) {
        // ไม่แสดงข้อความ encryption error ให้ผู้ใช้เห็น เพื่อลดความสับสน
        this.logger.warn('Encryption modes issue detected - this is a known Discord.js issue');
        // ลองเล่นเพลงถัดไปใน queue
        if (queue.tracks.size > 0) {
          queue.node.skip();
        }
      } else {
        queue.metadata.channel?.send('❌ เกิดข้อผิดพลาดในการเล่นเพลง');
      }
    });

    this.player.events.on('playerError', (queue, error) => {
      this.logger.error('Player error:', error);
      
      // ตรวจสอบประเภทของ error
      if (error.message?.includes('Could not extract stream')) {
        queue.metadata.channel?.send('❌ ไม่สามารถดึงสตรีมเพลงได้ ลองเพลงอื่น');
      } else if (error.message?.includes('encryption modes')) {
        // ไม่แสดงข้อความ encryption error ให้ผู้ใช้เห็น
        this.logger.warn('Encryption modes issue detected - this is a known Discord.js issue');
        // ลองเล่นเพลงถัดไปใน queue
        if (queue.tracks.size > 0) {
          queue.node.skip();
        }
      } else {
        queue.metadata.channel?.send('❌ เกิดข้อผิดพลาดในการเล่นเพลง');
      }
    });

    this.logger.log('Discord Player initialized successfully');
    return this.player;
  }

  getPlayer(): Player {
    return this.player;
  }
}
    // Shim for discord-player v6 calling generateDependencyReport() on discord-voip
    // discord-voip@7 removed this export; add a minimal compatible function to avoid runtime TypeError
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const voip = require('discord-voip');
      if (voip && typeof voip.generateDependencyReport !== 'function') {
        voip.generateDependencyReport = () => {
          try {
            const aesGcm = crypto.getCiphers().includes('aes-256-gcm');
            let sodiumNative = false,
              sodium = false,
              libsodium = false,
              stablelib = false,
              noble = false;
            try { require.resolve('sodium-native'); sodiumNative = true; } catch {}
            try { require.resolve('sodium'); sodium = true; } catch {}
            try { require.resolve('libsodium-wrappers'); libsodium = true; } catch {}
            try { require.resolve('@stablelib/xchacha20poly1305'); stablelib = true; } catch {}
            try { require.resolve('@noble/ciphers'); noble = true; } catch {}
            const voipVersion = (() => { try { return require('discord-voip/package.json').version; } catch { return 'unknown'; } })();
            return [
              '--------------------------------------------------',
              'discord-voip (shim) dependency report',
              `- discord-voip: ${voipVersion}`,
              '',
              'Encryption Libraries',
              `- native crypto aes-256-gcm: ${aesGcm ? 'yes' : 'no'}`,
              `- sodium-native: ${sodiumNative ? 'found' : 'not found'}`,
              `- sodium: ${sodium ? 'found' : 'not found'}`,
              `- libsodium-wrappers: ${libsodium ? 'found' : 'not found'}`,
              `- @stablelib/xchacha20poly1305: ${stablelib ? 'found' : 'not found'}`,
              `- @noble/ciphers: ${noble ? 'found' : 'not found'}`,
              '--------------------------------------------------',
            ].join('\n');
          } catch {
            return 'discord-voip generateDependencyReport (shim)';
          }
        };
      }
    } catch {}
