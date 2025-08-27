import { NecordPaginationService, PageBuilder } from '@necord/pagination';
import { Injectable, Logger } from '@nestjs/common';
import { GameMatchDB } from '@prisma/client';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  GuildMember,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  VoiceChannel,
} from 'discord.js';
import { StringSelectContext } from 'necord';
import { Context } from 'necord';
import { StringSelect } from 'necord';
import { GameTypeRepository } from 'src/game-type/game-type.repository';
import { GameRepository } from 'src/game/game.repository';
import { GameRankRepository } from 'src/game-rank/game-rank.repository';
import { PrismaService } from 'src/prisma.service';

const CATEGORY_TITLE = 'แนวเกมส์';
const ITEMS_PER_PAGE = 20;

@Injectable()
export class GameJoinService {
  private readonly logger = new Logger(GameJoinService.name);
  private selectedValues: { key: string; user: string; value: string }[] = [];
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: Client,
    private readonly paginationService: NecordPaginationService,
    private readonly gameTypeRepository: GameTypeRepository,
    private readonly gameRepository: GameRepository,
    private readonly gameRankRepository: GameRankRepository,
  ) {}

  public async onModuleInit() {
    this.logger.log('GameCreateRoomService initialized');
    const gameTypes = await this.gameTypeRepository.getGameTypesWithPagination(
      CATEGORY_TITLE,
      1,
      ITEMS_PER_PAGE,
    );

    return this.paginationService.register((builder) =>
      builder
        .setCustomId('GAME_JOIN')
        .setPagesFactory(async (page) =>
          new PageBuilder()
            .setContent(`หน้า ${page}/${Math.ceil(gameTypes.total / gameTypes.limit)}`)
            .setComponents([
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('GAME_JOIN_SELECT_MENU_GAME_TYPE')
                  .setPlaceholder('เลือกประเภทเกมส์')
                  .setMaxValues(1)
                  .setMinValues(1)
                  .setOptions(
                    (
                      await this.gameTypeRepository.getGameTypesWithPagination(
                        CATEGORY_TITLE,
                        page,
                        ITEMS_PER_PAGE,
                      )
                    ).data.map((gameType) => ({
                      label: gameType.title,
                      value: gameType.id,
                    })),
                  ),
              ),
            ]),
        )
        .setMaxPages(Math.ceil(gameTypes.total / gameTypes.limit)),
    );
  }

  private storeSelectedValues(key: string, user: string, values: string[]) {
    // Check if the value already exists for the user and key
    const existingIndex = this.selectedValues.findIndex(
      (entry) => entry.key === key && entry.user === user,
    );

    if (existingIndex !== -1) {
      // Update the existing entry
      this.selectedValues[existingIndex].value = values.join(' ');
    } else {
      // Add a new entry
      this.selectedValues.push({ key, user, value: values.join(' ') });
    }
  }

  private async collectVoiceChannels(interCollect: any): Promise<VoiceChannel[]> {
    try {
      const channelData: VoiceChannel[] = [];
      interCollect.guild.channels.cache.forEach((channel) => {
        if (channel instanceof VoiceChannel) {
          channelData.push(channel);
        }
      });

      return channelData;
    } catch (error) {
      this.logger.error('Error collecting voice channels:', error);
      throw error;
    }
  }

  private async isUserConnectedToVoiceChannel(
    interaction: StringSelectMenuInteraction<CacheType>,
  ): Promise<boolean> {
    if (interaction.member instanceof GuildMember) {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ ไม่พบการเชื่อมต่อช่องเสียง')
              .setDescription('คุณต้องเชื่อมต่อกับช่องเสียงก่อนจึงจะสามารถใช้งานคำสั่งนี้ได้')
              .setColor('Red'), // ✅ สีแดง
            // .setThumbnail('https://cdn-icons-png.flaticon.com/512/1828/1828843.png'), // (optional) ไอคอนเตือน
          ],
          components: [],
          ephemeral: true, // 👈 ซ่อนข้อความให้เห็นเฉพาะคนกด (แนะนำ)
        });

        // ✅ ลบข้อความหลัง 10 วินาที
        setTimeout(async () => {
          try {
            await interaction.deleteReply();
          } catch (err) {
            console.warn('⚠️ ไม่สามารถลบข้อความ:', err.message);
          }
        }, 10000);

        return false;
      }
    }
    return true;
  }

  @StringSelect('GAME_JOIN_SELECT_MENU_GAME_TYPE')
  public async onSelectMenu(@Context() [interaction]: StringSelectContext) {
    if (!(await this.isUserConnectedToVoiceChannel(interaction))) {
      return;
    }

    const user = interaction.user;

    this.storeSelectedValues('game_join', user.id, interaction.values);
    this.storeSelectedValues('user_id', user.id, [user.id]);
    this.storeSelectedValues('user_name', user.id, [user.username]);
    this.storeSelectedValues('user_display_name', user.id, [user.displayName]);
    this.storeSelectedValues('user_tag', user.id, [user.tag]);
    this.storeSelectedValues('user_avatar', user.id, [user.avatarURL()]);
    this.storeSelectedValues('user_created_at', user.id, [user.createdAt.toISOString()]);

    const games = await this.gameRepository.getGamesByType(
      interaction.values[0],
      1,
      ITEMS_PER_PAGE,
    );
    this.paginationService.register((builder) =>
      builder
        .setCustomId('select_menu_game_join')
        .setPagesFactory(async (page) =>
          new PageBuilder()
            .setContent(`Page ${page}/${Math.ceil(games.total / games.limit)}`)
            .setComponents([
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('GAME_JOIN_SELECT_MENU_GAME')
                  .setPlaceholder('เลือกเกมส์')
                  .setMaxValues(1)
                  .setMinValues(1)
                  .setOptions(
                    (
                      await this.gameRepository.getGamesByType(
                        interaction.values[0],
                        page,
                        ITEMS_PER_PAGE,
                      )
                    ).data.map((game) => ({
                      label: game.game_name,
                      value: game.id,
                    })),
                  ),
              ),
            ]),
        )
        .setMaxPages(Math.ceil(games.total / games.limit)),
    );
    const pagination = this.paginationService.get('select_menu_game_join');
    const page = await pagination.build();

    return interaction.update({ ...page });
  }

  @StringSelect('GAME_JOIN_SELECT_MENU_GAME')
  public async onSelectMenuPlayMode(@Context() [interaction]: StringSelectContext) {
    if (!(await this.isUserConnectedToVoiceChannel(interaction))) {
      return;
    }

    const user = interaction.user;
    this.storeSelectedValues('select_menu_game', user.id, interaction.values);

    const game_uid = interaction.values[0];
    const game = await this.gameRepository.getGameById(game_uid);

    const options = [];

    if (game.ranking) {
      options.push({
        label: 'โหมดจัดอันดับ',
        value: 'RANKED',
      });
    }

    options.push(
      {
        label: 'โหมดปกติ',
        value: 'NORMAL',
      },
      {
        label: 'กำหนดเอง',
        value: 'CUSTOM',
      },
    );

    return interaction.update({
      content: '',
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('GAME_JOIN_SELECT_MENU_PLAY_MODE')
            .setPlaceholder('เลือกโหมดห้องเล่น')
            .setMaxValues(1)
            .setMinValues(1)
            .setOptions(options),
        ),
      ],
    });
  }

  @StringSelect('GAME_JOIN_SELECT_MENU_PLAY_MODE')
  public async onSelectMenuPlayRangedMode(@Context() [interaction]: StringSelectContext) {
    if (!(await this.isUserConnectedToVoiceChannel(interaction))) {
      return;
    }

    const user = interaction.user;
    this.storeSelectedValues('select_menu_play_mode', user.id, interaction.values);

    const check_no_range = interaction.values[0] === 'NORMAL';
    const game_uid = this.selectedValues.find(
      (value) => value.key === 'select_menu_game' && value.user === user.id,
    )?.value;

    if (check_no_range) {
      const game_name = await this.gameRepository.getGameById(game_uid);
      const room_name = ` ${game_name.game_name} `;

      if (game_name) {
        return this.joinGameRoom(interaction, room_name, 'NORMAL');
      }
    }

    const check_custom = interaction.values[0] === 'CUSTOM';
    if (check_custom) {
      const game_name = await this.gameRepository.getGameById(game_uid);
      const room_name = ` ${game_name.game_name} `;

      if (game_name) {
        return this.joinGameRoom(interaction, room_name, 'CUSTOM');
      }
    }

    // สำหรับโหมด RANKED ให้เลือกระดับแรงค์ก่อน
    const game_rank = await this.gameRankRepository.getGamesRank(game_uid);

    if (!game_rank.length) {
      return interaction.update({
        components: [],
        content: 'ไม่พบระดับการเล่นสําหรับเกมนี้',
      });
    }

    return interaction.update({
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('GAME_JOIN_SELECT_MENU_PLAY_RANGED_MODE')
            .setPlaceholder('เลือกระดับการเล่น')
            .setMaxValues(1)
            .setMinValues(1)
            .setOptions(
              game_rank.map((game) => ({
                label: game.nameRank,
                value: game.id,
              })),
            ),
        ),
      ],
    });
  }

  @StringSelect('GAME_JOIN_SELECT_MENU_PLAY_RANGED_MODE')
  public async onSelectRankedMode(@Context() [interaction]: StringSelectContext) {
    if (!(await this.isUserConnectedToVoiceChannel(interaction))) {
      return;
    }

    const user = interaction.user;
    this.storeSelectedValues('select_menu_play_ranged_mode', user.id, interaction.values);

    const game_uid = this.selectedValues.find(
      (value) => value.key === 'select_menu_game' && value.user === user.id,
    )?.value;

    const gameRank = await this.gameRankRepository.getGamesRankByID(interaction.values[0]);
    const game_name = await this.gameRepository.getGameById(game_uid);

    if (!game_name) {
      return interaction.update({
        components: [],
        content: 'ไม่พบเกมส์นี้',
      });
    }

    const room_name = ` ${game_name.game_name} `;

    return this.joinGameRoom(interaction, room_name, 'RANKED', gameRank.nameRank);
  }

  private async joinGameRoom(
    interaction: StringSelectMenuInteraction<CacheType>,
    roomName: string,
    mode: string,
    rankName?: string,
  ) {
    const member = interaction.member as GuildMember;
    const user_data = await this.prisma.userDB.findFirst({
      where: {
        discord_id: interaction.user.id,
      },
    });

    if (!user_data) {
      return interaction.reply({
        content: `กรุณาลงทะเบียน นักผจญภัยเพื่อใช้งานระบบนี้`,
        ephemeral: true,
      });
    }

    if (!member.voice.channel) {
      return interaction.reply({
        content: `กรุณาเข้าร่วมช่องเสียงเพื่อใช้คำสั่ง`,
        ephemeral: true,
      });
    }

    try {
      const channelData = await this.collectVoiceChannels(interaction);
      
      // สร้าง pattern ตาม mode และ rank
      let matchPattern: RegExp;
      if (mode === 'RANKED' && rankName) {
        matchPattern = new RegExp(`^🎮・\\s*${roomName.trim()}\\s*-\\s*${rankName}\\s*-\\s*RMG`);
      } else {
        matchPattern = new RegExp(`^🎮・\\s*${roomName.trim()}\\s*-\\s*RMG`);
      }

      const gameChannel = channelData.filter((channel) =>
        matchPattern.test(channel.name),
      );

      if (gameChannel.length < 1) {
        return interaction.update({
          content: `ยังไม่มีสมาชิกสร้างห้องเล่นเกม${mode === 'RANKED' ? `แรงค์ ${rankName}` : ''}นี้`,
          components: [],
        });
      }

      const selectedChannel = gameChannel[Math.floor(Math.random() * gameChannel.length)];
      await member.voice.setChannel(selectedChannel);
      
      await interaction.update({
        content: `✅ เข้าร่วมห้องเกมส์ **${selectedChannel.name}** เรียบร้อยแล้ว!`,
        components: [],
        embeds: [
          new EmbedBuilder()
            .setTitle('🎮 เข้าร่วมห้องเกมส์สำเร็จ!')
            .setDescription(`คุณได้เข้าร่วมห้อง **${selectedChannel.name}**`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
              { name: 'ชื่อห้อง', value: `${selectedChannel.name}`, inline: true },
              {
                name: 'จำนวนผู้เล่นปัจจุบัน',
                value: `${selectedChannel.members.size}`,
                inline: true,
              },
              {
                name: 'โหมด',
                value: mode === 'RANKED' ? `จัดอันดับ (${rankName})` : mode === 'NORMAL' ? 'ปกติ' : 'กำหนดเอง',
                inline: true,
              },
            )
            .setColor('Green'),
        ],
        files: [],
      });

      // ✅ ลบข้อความหลัง 10 วินาที
      setTimeout(async () => {
        try {
          await interaction.deleteReply();
        } catch (err) {
          console.warn('⚠️ ไม่สามารถลบข้อความ:', err.message);
        }
      }, 10_000); // 10 วินาที
    } catch (error) {
      this.logger.error('Error in joining game room:', error);
      return interaction.update({
        content: '❌ เกิดข้อผิดพลาดในการเข้าร่วมห้องเกมส์ กรุณาลองใหม่อีกครั้ง',
        components: [],
      });
    }
  }
}
