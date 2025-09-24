import { Injectable, Logger } from '@nestjs/common';
import { GuildMember, VoiceChannel } from 'discord.js';
import { Player, PlayerEvents } from 'discord-player';
import { SlashCommandContext } from 'necord';
import { PlayerService } from './player.service';
import { UiService } from './ui.service';
import { PlayDto, VolumeDto } from './dto';

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);
  private static readonly MAX_RANDOM_DURATION_MS = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly playerService: PlayerService,
    private readonly uiService: UiService,
  ) {
    this.logger.log('Music service initialized');
  }

  private get player(): Player {
    return this.playerService.getPlayer();
  }

  private getRandomSong(): string {
    const popularSearchQueries = [
      'music 2024',
      'popular songs 2024',
      'top hits 2024',
      'trending music',
      'viral songs',
      'music playlist',
      'best songs',
      'hot music',
      'new music',
      'latest songs',
      'music mix',
      'hit songs',
      'music video',
      'song of the day',
      'music discovery',
      'indie music',
      'pop music',
      'rock music',
      'hip hop music',
      'electronic music',
      'jazz music',
      'classical music',
      'country music',
      'rnb music',
      'kpop music',
      'lofi music',
      'chill music',
      'party music',
      'workout music',
      'study music',
      'relaxing music',
      'sad songs',
      'happy songs',
      'love songs',
      'dance music',
      'summer music',
      'winter music',
      'christmas music',
      'music for kids',
      'acoustic music',
      'live music',
      'concert music',
      'music festival',
      'music compilation',
      'music highlights',
      'music trending now',
      'music viral',
      'music reaction',
      'music cover',
      'music original'
    ];

    const randomIndex = Math.floor(Math.random() * popularSearchQueries.length);
    return popularSearchQueries[randomIndex];
  }

  private getGuaranteedSong(): string {
    // รายการเพลงที่แน่นอนว่าจะหาเจอ
    const guaranteedSongs = [
      'Alan Walker Faded',
      'Ed Sheeran Shape of You',
      'The Weeknd Blinding Lights',
      'Dua Lipa Levitating',
      'Billie Eilish Bad Guy',
      'Post Malone Circles',
      'Ariana Grande Positions',
      'Taylor Swift Anti-Hero',
      'Harry Styles As It Was',
      'Olivia Rodrigo Drivers License',
      'Doja Cat Say So',
      'The Kid LAROI Stay',
      'Justin Bieber Peaches',
      'Bruno Mars 24K Magic',
      'Maroon 5 Sugar',
      'Imagine Dragons Believer',
      'Coldplay Viva La Vida',
      'Queen Bohemian Rhapsody',
      'Michael Jackson Billie Jean',
      'Madonna Like a Prayer',
      'Whitney Houston I Will Always Love You',
      'Celine Dion My Heart Will Go On',
      'Elton John Rocket Man',
      'Beatles Hey Jude',
      'Rolling Stones Satisfaction',
      'Led Zeppelin Stairway to Heaven',
      'Pink Floyd Comfortably Numb',
      'AC/DC Thunderstruck',
      'Guns N\' Roses Sweet Child O\' Mine',
      'Nirvana Smells Like Teen Spirit',
      'Pearl Jam Alive',
      'Radiohead Creep',
      'Oasis Wonderwall',
      'Green Day American Idiot',
      'Linkin Park In the End',
      'Evanescence Bring Me to Life',
      'Red Hot Chili Peppers Californication',
      'Foo Fighters Everlong',
      'Metallica Enter Sandman',
      'Iron Maiden The Trooper'
    ];

    const randomIndex = Math.floor(Math.random() * guaranteedSongs.length);
    return guaranteedSongs[randomIndex];
  }

  private cleanQuery(query: string): string {
    if (!query) return '';
    
    // ลบอักขระพิเศษที่อาจทำให้เกิดปัญหา
    let cleanQuery = query.trim();
    
    // ตรวจสอบว่าเป็น URL หรือไม่
    try {
      new URL(cleanQuery);
      // ถ้าเป็น URL ที่ถูกต้อง ให้ใช้ตามเดิม
      return cleanQuery;
    } catch {
      // ถ้าไม่ใช่ URL ให้ทำความสะอาด
      cleanQuery = cleanQuery.replace(/[<>:"/\\|?*]/g, '');
      cleanQuery = cleanQuery.replace(/\s+/g, ' ');
      return cleanQuery.trim();
    }
  }

  private async getRandomSongFromYouTube(): Promise<string> {
    try {
      const randomQuery = this.getRandomSong();
      
      // ค้นหาเพลงจาก YouTube
      const searchResult = await this.player.search(randomQuery, {
        searchEngine: 'youtube',
      });

      if (searchResult && searchResult.tracks.length > 0) {
        // สุ่มเลือกเพลงจากผลการค้นหา
        const randomTrackIndex = Math.floor(Math.random() * Math.min(searchResult.tracks.length, 5)); // เลือกจาก 5 อันดับแรก
        return searchResult.tracks[randomTrackIndex].title;
      }
      
      // fallback to static list if no results
      this.logger.warn(`No results for random query: ${randomQuery}, using fallback`);
      return this.getRandomSong();
    } catch (error) {
      this.logger.error('Error getting random song from YouTube:', error);
      return this.getRandomSong(); // fallback to static list
    }
  }

  // ตรวจว่าเป็นแทร็กทางการหรือไม่ (Official/VEVO/Topic)
  private isOfficialTrack(track: any): boolean {
    const title = String(track?.title || '').toLowerCase();
    const author = String(track?.author || '').toLowerCase();
    // สัญญาณที่พบบ่อยของแชนแนล/วิดีโอทางการ
    const indicators = [
      'official music video',
      'official video',
      'official mv',
      'official',
      'vevo',
      '- topic',
    ];
    // บางคำที่มักไม่เป็น MV ทางการ (ลดโอกาส)
    const dePrioritize = ['lyrics', 'lyric', 'live', 'cover'];
    const hit = indicators.some((k) => title.includes(k) || author.includes(k));
    const negative = dePrioritize.some((k) => title.includes(k));
    return hit && !negative;
  }

  // เลือกเพลงแบบสุ่มโดยจำกัดความยาวไม่เกิน 10 นาที และเน้น Official
  private pickRandomTrackUnderLimit(
    tracks: any[],
    maxMs = MusicService.MAX_RANDOM_DURATION_MS,
    preferOfficial = true,
  ) {
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    const filtered = tracks.filter(
      (t) => typeof t?.durationMS === 'number' && t.durationMS > 0 && t.durationMS <= maxMs,
    );
    if (filtered.length === 0) return null;

    let pool = filtered;
    if (preferOfficial) {
      const officialOnly = filtered.filter((t) => this.isOfficialTrack(t));
      if (officialOnly.length > 0) pool = officialOnly;
    }

    const sample = pool.slice(0, Math.min(pool.length, 10));
    const idx = Math.floor(Math.random() * Math.min(sample.length, 5));
    return sample[idx] ?? pool[0];
  }

  async play([interaction]: SlashCommandContext, options: PlayDto) {
    // ดึงค่า query จาก DTO
    const query = options.query;
    const isRandomSong = !query;
    
    // ถ้าไม่ได้ระบุเพลง ให้สุ่มเพลงจาก YouTube
    const finalQuery = query || await this.getRandomSongFromYouTube();
    
    // ตรวจสอบและทำความสะอาด query
    const cleanQuery = this.cleanQuery(finalQuery);
    if (!this.player) {
      return interaction.reply({
        content: '❌ ระบบเพลงยังไม่พร้อมใช้งาน',
        ephemeral: true,
      });
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel as VoiceChannel;

    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ คุณต้องอยู่ในช่องเสียงก่อน',
        ephemeral: true,
      });
    }

    try {
      await interaction.deferReply();

      // ตรวจสอบว่า query ถูกต้องหรือไม่
      if (!cleanQuery || cleanQuery.length === 0) {
        return interaction.editReply({
          content: '❌ ไม่พบคำค้นหาที่ถูกต้อง กรุณาลองใหม่',
        });
      }

      const searchResult = await this.player.search(cleanQuery, {
        requestedBy: interaction.user,
        searchEngine: 'youtube',
        fallbackSearchEngine: 'soundcloud',
      });

      if (!searchResult || !searchResult.tracks.length) {
        // ถ้าเป็นการค้นหาปกติ ให้ลองสุ่มเพลงแทน
        if (!isRandomSong) {
          this.logger.log(`Search failed for query: ${finalQuery}, trying random song`);
          const randomQuery = await this.getRandomSongFromYouTube();
          const fallbackResult = await this.player.search(randomQuery, {
            requestedBy: interaction.user,
            searchEngine: 'youtube',
          });
          
          if (fallbackResult && fallbackResult.tracks.length > 0) {
            const track = fallbackResult.tracks[0];
            const queue = this.player.nodes.create(interaction.guild, {
              metadata: {
                channel: interaction.channel,
                client: interaction.guild.members.me,
                requestedBy: interaction.user,
              },
              selfDeaf: true,
              volume: 80,
              leaveOnEmpty: true,
              leaveOnEmptyCooldown: 300000,
              leaveOnEnd: true,
              leaveOnEndCooldown: 300000,
              connectionTimeout: 20000,
              bufferingTimeout: 1000,
            });

            try {
              if (!queue.connection) {
                // ตั้งค่า encryption modes ก่อนเชื่อมต่อ
                await queue.connect(voiceChannel, {
                  group: 'music',
                });
              }
            } catch (error) {
              this.logger.error('Error connecting to voice channel:', error);
              // ลองเชื่อมต่ออีกครั้งด้วยการตั้งค่าที่แตกต่าง
              try {
                await queue.connect(voiceChannel);
              } catch (retryError) {
                this.logger.error('Retry connection failed:', retryError);
                return interaction.editReply({
                  content: '❌ ไม่สามารถเชื่อมต่อกับช่องเสียงได้',
                });
              }
            }

            queue.addTrack(track);

            if (!queue.isPlaying()) {
              await queue.node.play();
            }

            const embed = this.uiService.createSearchResultEmbed(track, true);
            const buttons = this.uiService.createMusicControlButtons();

            return interaction.editReply({
              embeds: [embed],
              components: [buttons],
            });
          }
        }
        
        const errorEmbed = this.uiService.createErrorEmbed('ไม่พบเพลงที่ค้นหา กรุณาลองคำค้นหาอื่น');
        return interaction.editReply({
          embeds: [errorEmbed],
        });
      }

      const queue = this.player.nodes.create(interaction.guild, {
        metadata: {
          channel: interaction.channel,
          client: interaction.guild.members.me,
          requestedBy: interaction.user,
        },
        selfDeaf: true,
        volume: 80,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 300000,
        // เพิ่มการตั้งค่าสำหรับ voice connection
        connectionTimeout: 20000,
        bufferingTimeout: 1000,
      });

        try {
          if (!queue.connection) {
            // ตั้งค่า encryption modes ก่อนเชื่อมต่อ
            await queue.connect(voiceChannel, {
              group: 'music',
            });
          }
        } catch (error) {
          this.logger.error('Error connecting to voice channel:', error);
          // ลองเชื่อมต่ออีกครั้งด้วยการตั้งค่าที่แตกต่าง
          try {
            await queue.connect(voiceChannel);
          } catch (retryError) {
            this.logger.error('Retry connection failed:', retryError);
            return interaction.editReply({
              content: '❌ ไม่สามารถเชื่อมต่อกับช่องเสียงได้',
            });
          }
        }

      const track = searchResult.tracks[0];
      queue.addTrack(track);

      if (!queue.isPlaying()) {
        try {
          await queue.node.play();
        } catch (playError) {
          this.logger.error('Failed to play track, trying next track:', playError);
          
          // ลองเล่นเพลงถัดไปในผลการค้นหา
          if (searchResult.tracks.length > 1) {
            const nextTrack = searchResult.tracks[1];
            queue.tracks.clear();
            queue.addTrack(nextTrack);
            await queue.node.play();
            
            const embed = this.uiService.createSearchResultEmbed(nextTrack, isRandomSong);
            const buttons = this.uiService.createMusicControlButtons();
            return interaction.editReply({
              embeds: [embed],
              components: [buttons],
            });
          } else {
            throw playError;
          }
        }
      }

      const embed = this.uiService.createSearchResultEmbed(track, isRandomSong);
      const buttons = this.uiService.createMusicControlButtons();

      return interaction.editReply({
        embeds: [embed],
        components: [buttons],
      });
    } catch (error) {
      this.logger.error('Error in play command:', error);
      
      // ลองใช้ fallback สำหรับข้อผิดพลาด
      try {
        const fallbackQuery = this.getRandomSong();
        const fallbackResult = await this.player.search(fallbackQuery, {
          requestedBy: interaction.user,
          searchEngine: 'youtube',
        });
        
        if (fallbackResult && fallbackResult.tracks.length > 0) {
          const track = fallbackResult.tracks[0];
      const queue = this.player.nodes.create(interaction.guild, {
        metadata: {
          channel: interaction.channel,
          client: interaction.guild.members.me,
          requestedBy: interaction.user,
        },
        selfDeaf: true,
        volume: 80,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 300000,
        connectionTimeout: 20000,
        bufferingTimeout: 1000,
      });

          if (!queue.connection) {
            await queue.connect(voiceChannel);
          }

          queue.addTrack(track);

          if (!queue.isPlaying()) {
            await queue.node.play();
          }

          const embed = this.uiService.createSearchResultEmbed(track, true);
          const buttons = this.uiService.createMusicControlButtons();
          return interaction.editReply({
            embeds: [embed],
            components: [buttons],
          });
        }
      } catch (fallbackError) {
        this.logger.error('Fallback also failed:', fallbackError);
        
        // ลองใช้ guaranteed songs เป็น fallback สุดท้าย
        try {
          const guaranteedSong = this.getGuaranteedSong();
          const guaranteedResult = await this.player.search(guaranteedSong, {
            requestedBy: interaction.user,
            searchEngine: 'youtube',
          });
          
          if (guaranteedResult && guaranteedResult.tracks.length > 0) {
            const track = guaranteedResult.tracks[0];
            const queue = this.player.nodes.create(interaction.guild, {
              metadata: {
                channel: interaction.channel,
                client: interaction.guild.members.me,
                requestedBy: interaction.user,
              },
              selfDeaf: true,
              volume: 80,
              leaveOnEmpty: true,
              leaveOnEmptyCooldown: 300000,
              leaveOnEnd: true,
              leaveOnEndCooldown: 300000,
              connectionTimeout: 20000,
              bufferingTimeout: 1000,
            });

            if (!queue.connection) {
              await queue.connect(voiceChannel);
            }

            queue.addTrack(track);

            if (!queue.isPlaying()) {
              await queue.node.play();
            }

            const embed = this.uiService.createSearchResultEmbed(track, true);
            const buttons = this.uiService.createMusicControlButtons();
            return interaction.editReply({
              embeds: [embed],
              components: [buttons],
            });
          }
        } catch (guaranteedError) {
          this.logger.error('Guaranteed songs also failed:', guaranteedError);
        }
      }
      
      // ตรวจสอบว่า interaction ยังตอบได้หรือไม่
      if (interaction.deferred || interaction.replied) {
        try {
          const errorEmbed = this.uiService.createErrorEmbed('เกิดข้อผิดพลาดในการเล่นเพลง กรุณาลองใหม่ภายหลัง');
          return await interaction.editReply({
            embeds: [errorEmbed],
          });
        } catch (editError) {
          this.logger.error('Failed to edit reply:', editError);
          return;
        }
      } else {
        try {
          const errorEmbed = this.uiService.createErrorEmbed('เกิดข้อผิดพลาดในการเล่นเพลง กรุณาลองใหม่ภายหลัง');
          return await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true,
          });
        } catch (replyError) {
          this.logger.error('Failed to reply:', replyError);
          return;
        }
      }
    }
  }

  async skip([interaction]: SlashCommandContext) {
    if (!this.player) {
      return interaction.reply({
        content: '❌ ระบบเพลงยังไม่พร้อมใช้งาน',
        ephemeral: true,
      });
    }

    const queue = this.player.nodes.get(interaction.guild);

    if (!queue || !queue.isPlaying()) {
      return interaction.reply({
        content: '❌ ไม่มีเพลงที่กำลังเล่นอยู่',
        ephemeral: true,
      });
    }

    const currentTrack = queue.currentTrack;
    queue.node.skip();

    const embed = this.uiService.createSuccessEmbed(`⏭️ ข้ามเพลง **${currentTrack.title}** แล้ว`);
    const buttons = this.uiService.createMusicControlButtons();

    return interaction.reply({
      embeds: [embed],
      components: [buttons],
    });
  }

  async stop([interaction]: SlashCommandContext) {
    if (!this.player) {
      return interaction.reply({
        content: '❌ ระบบเพลงยังไม่พร้อมใช้งาน',
        ephemeral: true,
      });
    }

    const queue = this.player.nodes.get(interaction.guild);

    if (!queue || !queue.isPlaying()) {
      return interaction.reply({
        content: '❌ ไม่มีเพลงที่กำลังเล่นอยู่',
        ephemeral: true,
      });
    }

    queue.delete();

    const embed = this.uiService.createSuccessEmbed('⏹️ หยุดเพลงและออกจากช่องเสียงแล้ว');
    return interaction.reply({
      embeds: [embed],
    });
  }

  async pause([interaction]: SlashCommandContext) {
    if (!this.player) {
      return interaction.reply({
        content: '❌ ระบบเพลงยังไม่พร้อมใช้งาน',
        ephemeral: true,
      });
    }

    const queue = this.player.nodes.get(interaction.guild);

    if (!queue || !queue.isPlaying()) {
      return interaction.reply({
        content: '❌ ไม่มีเพลงที่กำลังเล่นอยู่',
        ephemeral: true,
      });
    }

    const paused = queue.node.pause();
    const status = paused ? '⏸️ หยุดชั่วคราว' : '▶️ เล่นต่อ';

    const embed = this.uiService.createSuccessEmbed(`${status} **${queue.currentTrack.title}**`);
    const buttons = this.uiService.createMusicControlButtons();

    return interaction.reply({
      embeds: [embed],
      components: [buttons],
    });
  }

  async queue([interaction]: SlashCommandContext) {
    if (!this.player) {
      return interaction.reply({
        content: '❌ ระบบเพลงยังไม่พร้อมใช้งาน',
        ephemeral: true,
      });
    }

    const queue = this.player.nodes.get(interaction.guild);

    if (!queue || !queue.tracks.size) {
      return interaction.reply({
        content: '❌ ไม่มีเพลงในคิว',
        ephemeral: true,
      });
    }

    const tracks = queue.tracks.toArray();
    const embed = this.uiService.createQueueEmbed(tracks);
    const buttons = this.uiService.createMusicControlButtons();

    return interaction.reply({
      embeds: [embed],
      components: [buttons],
    });
  }

  async nowPlaying([interaction]: SlashCommandContext) {
    if (!this.player) {
      return interaction.reply({
        content: '❌ ระบบเพลงยังไม่พร้อมใช้งาน',
        ephemeral: true,
      });
    }

    const queue = this.player.nodes.get(interaction.guild);

    if (!queue || !queue.isPlaying()) {
      return interaction.reply({
        content: '❌ ไม่มีเพลงที่กำลังเล่นอยู่',
        ephemeral: true,
      });
    }

    const track = queue.currentTrack;
    const progress = queue.node.createProgressBar();
    const embed = this.uiService.createNowPlayingEmbed(track, progress);
    const buttons = this.uiService.createMusicControlButtons();

    return interaction.reply({
      embeds: [embed],
      components: [buttons],
    });
  }

  async volume([interaction]: SlashCommandContext, options: VolumeDto) {
    // ดึงค่า level จาก DTO
    const level = options.level;
    if (!this.player) {
      return interaction.reply({
        content: '❌ ระบบเพลงยังไม่พร้อมใช้งาน',
        ephemeral: true,
      });
    }

    const queue = this.player.nodes.get(interaction.guild);

    if (!queue || !queue.isPlaying()) {
      return interaction.reply({
        content: '❌ ไม่มีเพลงที่กำลังเล่นอยู่',
        ephemeral: true,
      });
    }

    if (level < 0 || level > 100) {
      return interaction.reply({
        content: '❌ ระดับเสียงต้องอยู่ระหว่าง 0-100',
        ephemeral: true,
      });
    }

    queue.node.setVolume(level);

    const embed = this.uiService.createSuccessEmbed(`🔊 ตั้งระดับเสียงเป็น **${level}%**`);
    const buttons = this.uiService.createVolumeControlButtons();

    return interaction.reply({
      embeds: [embed],
      components: [buttons],
    });
  }

  async playRandom([interaction]: SlashCommandContext) {
    if (!this.player) {
      return interaction.reply({
        content: '❌ ระบบเพลงยังไม่พร้อมใช้งาน',
        ephemeral: true,
      });
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel as VoiceChannel;

    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ คุณต้องอยู่ในช่องเสียงก่อน',
        ephemeral: true,
      });
    }

    try {
      await interaction.deferReply();

      // ใช้คำค้นหาเพื่อค้นหาเพลงสุ่ม
      const randomQuery = this.getRandomSong();
      const searchResult = await this.player.search(randomQuery, {
        requestedBy: interaction.user,
        searchEngine: 'youtube',
      });

      const initialPick = searchResult?.tracks?.length ? this.pickRandomTrackUnderLimit(searchResult.tracks) : null;
      if (!searchResult || !searchResult.tracks.length || !initialPick) {
        // ลองใช้คำค้นหาอื่น
        this.logger.warn(`No results for random query: ${randomQuery}, trying fallback`);
        const fallbackQuery = this.getRandomSong();
        const fallbackResult = await this.player.search(fallbackQuery, {
          requestedBy: interaction.user,
          searchEngine: 'youtube',
        });
        
        if (fallbackResult && fallbackResult.tracks.length > 0) {
          const track = this.pickRandomTrackUnderLimit(fallbackResult.tracks);
          if (track) {
          
      const queue = this.player.nodes.create(interaction.guild, {
        metadata: {
          channel: interaction.channel,
          client: interaction.guild.members.me,
          requestedBy: interaction.user,
        },
        selfDeaf: true,
        volume: 80,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 300000,
        connectionTimeout: 20000,
        bufferingTimeout: 1000,
      });

        try {
          if (!queue.connection) {
            // ตั้งค่า encryption modes ก่อนเชื่อมต่อ
            await queue.connect(voiceChannel, {
              group: 'music',
            });
          }
        } catch (error) {
          this.logger.error('Error connecting to voice channel:', error);
          // ลองเชื่อมต่ออีกครั้งด้วยการตั้งค่าที่แตกต่าง
          try {
            await queue.connect(voiceChannel);
          } catch (retryError) {
            this.logger.error('Retry connection failed:', retryError);
            return interaction.editReply({
              content: '❌ ไม่สามารถเชื่อมต่อกับช่องเสียงได้',
            });
          }
        }

          queue.addTrack(track);

          if (!queue.isPlaying()) {
            await queue.node.play();
          }

          return interaction.editReply({
            content: `🎲 สุ่มเพลง **${track.title}** ให้แล้ว! (ใช้ fallback)`,
          });
          }
        }
        
        // ลองใช้ guaranteed songs เป็น fallback สุดท้าย
        this.logger.warn('All YouTube searches failed, trying guaranteed songs');
        const guaranteedSong = this.getGuaranteedSong();
        const guaranteedResult = await this.player.search(guaranteedSong, {
          requestedBy: interaction.user,
          searchEngine: 'youtube',
        });
        
        if (guaranteedResult && guaranteedResult.tracks.length > 0) {
          const track = this.pickRandomTrackUnderLimit(guaranteedResult.tracks) ?? guaranteedResult.tracks[0];
          
      const queue = this.player.nodes.create(interaction.guild, {
        metadata: {
          channel: interaction.channel,
          client: interaction.guild.members.me,
          requestedBy: interaction.user,
        },
        selfDeaf: true,
        volume: 80,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 300000,
        connectionTimeout: 20000,
        bufferingTimeout: 1000,
      });

        try {
          if (!queue.connection) {
            // ตั้งค่า encryption modes ก่อนเชื่อมต่อ
            await queue.connect(voiceChannel, {
              group: 'music',
            });
          }
        } catch (error) {
          this.logger.error('Error connecting to voice channel:', error);
          // ลองเชื่อมต่ออีกครั้งด้วยการตั้งค่าที่แตกต่าง
          try {
            await queue.connect(voiceChannel);
          } catch (retryError) {
            this.logger.error('Retry connection failed:', retryError);
            return interaction.editReply({
              content: '❌ ไม่สามารถเชื่อมต่อกับช่องเสียงได้',
            });
          }
        }

          queue.addTrack(track);

          if (!queue.isPlaying()) {
            await queue.node.play();
          }

          return interaction.editReply({
            content: `🎲 สุ่มเพลง **${track.title}** ให้แล้ว! (ใช้เพลงสำรอง)`,
          });
        }
        
        return interaction.editReply({
          content: '❌ ไม่สามารถสุ่มเพลงได้ในขณะนี้ กรุณาลองใหม่ภายหลัง',
        });
      }

      const queue = this.player.nodes.create(interaction.guild, {
        metadata: {
          channel: interaction.channel,
          client: interaction.guild.members.me,
          requestedBy: interaction.user,
        },
        selfDeaf: true,
        volume: 80,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 300000,
        // เพิ่มการตั้งค่าสำหรับ voice connection
        connectionTimeout: 20000,
        bufferingTimeout: 1000,
      });

        try {
          if (!queue.connection) {
            // ตั้งค่า encryption modes ก่อนเชื่อมต่อ
            await queue.connect(voiceChannel, {
              group: 'music',
            });
          }
        } catch (error) {
          this.logger.error('Error connecting to voice channel:', error);
          // ลองเชื่อมต่ออีกครั้งด้วยการตั้งค่าที่แตกต่าง
          try {
            await queue.connect(voiceChannel);
          } catch (retryError) {
            this.logger.error('Retry connection failed:', retryError);
            return interaction.editReply({
              content: '❌ ไม่สามารถเชื่อมต่อกับช่องเสียงได้',
            });
          }
        }

      // สุ่มเลือกเพลงจากผลการค้นหาที่ความยาวไม่เกิน 10 นาที
      const track = this.pickRandomTrackUnderLimit(searchResult.tracks);
      if (!track) {
        this.logger.warn('Random results found but none under 10 minutes.');
        return interaction.editReply({
          content: '❌ ไม่พบเพลงที่สั้นกว่า 10 นาทีจากผลสุ่ม ลองใหม่อีกครั้ง',
        });
      }
      queue.addTrack(track);

      if (!queue.isPlaying()) {
        await queue.node.play();
      }

      const embed = this.uiService.createSearchResultEmbed(track, true);
      const buttons = this.uiService.createMusicControlButtons();
      return interaction.editReply({
        embeds: [embed],
        components: [buttons],
      });
    } catch (error) {
      this.logger.error('Error in playRandom command:', error);
      
      // ตรวจสอบว่า interaction ยังตอบได้หรือไม่
      if (interaction.deferred || interaction.replied) {
        try {
          const errorEmbed = this.uiService.createErrorEmbed('เกิดข้อผิดพลาดในการสุ่มเพลง');
          return await interaction.editReply({
            embeds: [errorEmbed],
          });
        } catch (editError) {
          this.logger.error('Failed to edit reply:', editError);
          return;
        }
      } else {
        try {
          const errorEmbed = this.uiService.createErrorEmbed('เกิดข้อผิดพลาดในการสุ่มเพลง');
          return await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true,
          });
        } catch (replyError) {
          this.logger.error('Failed to reply:', replyError);
          return;
        }
      }
    }
  }

  async showHelp([interaction]: SlashCommandContext) {
    const embed = this.uiService.createWelcomeEmbed();
    const buttons = this.uiService.createMusicControlButtons();

    return interaction.reply({
      embeds: [embed],
      components: [buttons],
    });
  }
}
