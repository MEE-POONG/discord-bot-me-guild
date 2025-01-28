import { NecordPaginationService, PageBuilder } from '@necord/pagination';
import {
  Button,
  ButtonContext,
  ContextOf,
  On,
  StringSelect,
  StringSelectContext,
} from 'necord';
import { Context } from 'necord';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  ActionRowBuilder,
  ChannelType,
  StringSelectMenuBuilder,
  GuildMember,
  CategoryChannel,
  VoiceChannel,
  CacheType,
  StringSelectMenuInteraction,
  ButtonStyle,
  ButtonBuilder,
  Client,
  TextChannel,
  DMChannel,
  NewsChannel,
  EmbedBuilder,
} from 'discord.js';
import { GameTypeRepository } from 'src/game-type/game-type.repository';
import { GameRepository } from 'src/game/game.repository';
import { GameRankRepository } from 'src/game-rank/game-rank.repository';
import { GameConditionMatchRepository } from 'src/game-condition-match/game-condition-match.repository';
import { ServerRepository } from 'src/repository/server';

const CATEGORY_TITLE = 'แนวเกมส์';
const ITEMS_PER_PAGE = 5;
const IMAGE_DELIVERY_URL = 'https://imagedelivery.net/QZ6TuL-3r02W7wQjQrv5DA';

@Injectable()
export class GameCreateRoomService implements OnModuleInit {
  private readonly logger = new Logger(GameCreateRoomService.name);
  private selectedValues: { key: string; user: string; value: string }[] = [];
  private client: Client;
  private party_id: string;

  public constructor(
    private readonly paginationService: NecordPaginationService,
    private readonly gameTypeRepository: GameTypeRepository,
    private readonly gameRepository: GameRepository,
    private readonly gameRankRepository: GameRankRepository,
    private readonly gameConditionMatchRepository: GameConditionMatchRepository,
    private readonly serverRepository: ServerRepository,
    client: Client,
  ) {
    this.client = client;
  }

  public async onModuleInit() {
    this.logger.log('GameCreateRoomService initialized');
    const gameTypes = await this.gameTypeRepository.getGameTypesWithPagination(
      CATEGORY_TITLE,
      1,
      ITEMS_PER_PAGE,
    );

    return this.paginationService.register((builder) =>
      builder
        .setCustomId('game_create_room')
        .setPagesFactory(async (page) =>
          new PageBuilder()
            .setContent(
              `หน้า ${page}/${Math.ceil(gameTypes.total / gameTypes.limit)}`,
            )
            .setComponents([
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('SELECT_MENU_GAME_CREATE_ROOM')
                  .setPlaceholder('เลือกประเภทเกมส์')
                  .setMaxValues(1)
                  .setMinValues(1)
                  .setOptions(
                    (
                      await this.gameTypeRepository.getGameTypesWithPagination(
                        CATEGORY_TITLE,
                        page,
                        5,
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

  private async isUserConnectedToVoiceChannel(
    interaction: StringSelectMenuInteraction<CacheType>,
  ): Promise<boolean> {
    if (interaction.member instanceof GuildMember) {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        await interaction.update({
          content: 'คุณต้องเชื่อมต่อกับช่องเสียงก่อน',
          components: [],
          files: [],
          embeds: [],
        });
        return false;
      }
    }
    return true;
  }

  @StringSelect('SELECT_MENU_GAME_CREATE_ROOM')
  public async onSelectMenu(@Context() [interaction]: StringSelectContext) {
    if (!(await this.isUserConnectedToVoiceChannel(interaction))) {
      return;
    }

    const user = interaction.user;

    this.storeSelectedValues('game_create_room', user.id, interaction.values);
    this.storeSelectedValues('user_id', user.id, [user.id]);
    this.storeSelectedValues('user_name', user.id, [user.username]);
    this.storeSelectedValues('user_display_name', user.id, [user.displayName]);
    this.storeSelectedValues('user_tag', user.id, [user.tag]);
    this.storeSelectedValues('user_avatar', user.id, [user.avatarURL()]);
    this.storeSelectedValues('user_created_at', user.id, [
      user.createdAt.toISOString(),
    ]);

    const games = await this.gameRepository.getGamesByType(
      interaction.values[0],
      1,
      ITEMS_PER_PAGE,
    );

    this.paginationService.register((builder) =>
      builder
        .setCustomId('select_menu_game')
        .setPagesFactory(async (page) =>
          new PageBuilder()
            .setContent(`Page ${page}/${Math.ceil(games.total / games.limit)}`)
            .setComponents([
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('SELECT_MENU_GAME')
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
    const pagination = this.paginationService.get('select_menu_game');
    const page = await pagination.build();

    return interaction.update({ ...page });
  }

  private async createAndMoveToVoiceChannel(
    interaction: StringSelectMenuInteraction<CacheType>,
    gameName: string,
    limit: number = 0,
  ) {
    const user = interaction.user;

    if (interaction.member instanceof GuildMember) {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.update({
          content: 'คุณต้องเชื่อมต่อกับช่องเสียงก่อน',
        });
      }
      const server = await this.serverRepository.getServerById(
        interaction.guildId,
      );
      if (!server) {
        return interaction.update({
          content: '❌ ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้',
        });
      }
      const gamePositionCreate = server.gamePositionCreate;
      const gameMacthReplyChanel = server.gamePostChannel;

      console.log('gamePositionCreate: 219', gamePositionCreate);

      if (!gamePositionCreate) {
        return interaction.update({
          content: '❌ ไม่มีตำแหน่งที่กำหนดไว้สำหรับสร้างห้องในเซิร์ฟเวอร์นี้',
        });
      }
      if (!gameMacthReplyChanel) {
        return interaction.update({
          content:
            '❌ ไม่มีตำแหน่งที่กำหนดสำหรับแจ้งเตือนการสร้างห้องเล่นเกมส์',
        });
      }

      const game_uid = this.selectedValues.find(
        (value) => value.key === 'select_menu_game' && value.user === user.id,
      )?.value;

      const game_rank_id = this.selectedValues.find(
        (value) =>
          value.key === 'select_menu_play_ranged_mode' &&
          value.user === user.id,
      )?.value;

      const game_rank = game_rank_id
        ? await this.gameRankRepository.getGamesRankByID(game_rank_id)
        : null;

      const game = await this.gameRepository.getGameById(game_uid);

      const channel_name = `🎮・${gameName} ${game_rank ? `- ${game_rank.nameRank}` : 'NORMAL'} - PARTY`;

      console.log('channel_name', channel_name);

      const channel = await interaction.guild?.channels.create({
        name: channel_name,
        type: ChannelType.GuildVoice,
        ...(limit ? { userLimit: limit } : {}),
        parent: interaction.guild.channels.cache.get(
          gamePositionCreate,
        ) as CategoryChannel,
      });

      if (channel) {
        await interaction.member.voice.setChannel(channel);
        this.party_id = channel.id;
        console.log('this.party_id: 220', this.party_id);

        const channel_text =
          await this.client.channels.fetch(gameMacthReplyChanel);
        console.log('channel_text: 220', channel_text);

        if (
          channel_text &&
          (channel_text instanceof TextChannel ||
            channel_text instanceof DMChannel ||
            channel_text instanceof NewsChannel)
        ) {
          await channel_text.send({
            content: `${interaction.user.username} ได้สร้างห้องเกมส์ ${channel.name}`,
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId(`JOIN_PARTY`)
                  .setLabel(`เข้าร่วมห้อง ${channel.name}`)
                  .setStyle(ButtonStyle.Primary),
              ),
            ],
            embeds: [
              new EmbedBuilder()
                .setTitle(`ห้องเกมส์ ${channel}`)
                .setThumbnail(
                  game_rank
                    ? `${IMAGE_DELIVERY_URL}/${game_rank.selcetShow}/100`
                    : `${IMAGE_DELIVERY_URL}/a7e16dc8-9047-4f0e-d397-934609548800/100`,
                )
                .setAuthor({
                  name: interaction.user.username,
                  iconURL: interaction.user.displayAvatarURL(),
                })
                .setDescription(`ผู้สร้าง : ${interaction.user}`)
                .addFields(
                  {
                    name: 'โหมด : ',
                    value: `${game_rank ? `โหมดจัดอันดับ` : 'โหมดปกติ'}`,
                    inline: true,
                  },
                  {
                    name: 'แรงค์ : ',
                    value: `${game_rank ? `แรงค์ (${game_rank.nameRank})` : '-'}`,
                    inline: true,
                  },
                  {
                    name: 'ขนาดปาร์ตี้ : ',
                    value: `${limit || 'ไม่จำกัด'}`,
                    inline: true,
                  },
                )
                .setImage(`${IMAGE_DELIVERY_URL}/${game.logo}/100`)
                .setColor('Red'),
            ],
          });
        }
      }

      this.logger.log('selectedValues', this.selectedValues);
      return interaction.update({
        content: `✅ สร้างห้องเกมส์ **${channel.name}** เรียบร้อยแล้ว!`,
        embeds: [
          new EmbedBuilder()
            .setTitle('🎮 ห้องเกมส์ถูกสร้างสำเร็จ!')
            .setDescription(`คุณได้สร้างห้อง **${channel.name}**`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
              { name: 'ชื่อห้อง', value: `${channel.name}`, inline: true },
              {
                name: 'จำนวนผู้เล่นสูงสุด',
                value: `${limit || 'ไม่จำกัด'}`,
                inline: true,
              },
            )
            .setColor('Blue'),
        ],
        components: [],
        files: [],
      });
    } else {
      return interaction.update({
        content: '❌ ไม่สามารถตั้งค่าช่องเสียงสำหรับสมาชิกนี้ได้',
        embeds: [
          new EmbedBuilder()
            .setTitle('⚠️ ข้อผิดพลาด')
            .setDescription(
              'ไม่สามารถตั้งค่าช่องเสียงสำหรับสมาชิกนี้ได้ กรุณาลองอีกครั้ง',
            )
            .setColor('Red'),
        ],
        components: [],
        files: [],
      });
    }
  }

  @Button('JOIN_PARTY')
  public async onJoinParty(@Context() [interaction]: ButtonContext) {
    if (interaction.member instanceof GuildMember) {
      const channelId = this.party_id;

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        await interaction.reply({
          content: '❌ คุณต้องอยู่ในห้องเสียงก่อนจึงจะสามารถเข้าร่วมห้องได้',
          ephemeral: true, // ข้อความจะเห็นได้เฉพาะผู้ใช้ที่กดปุ่ม
          fetchReply: true, // ใช้เพื่อให้เราสามารถดึงข้อมูลข้อความที่ส่งออกมาได้
        });
        return;
      }

      const channel = (await this.client.channels.fetch(
        channelId,
      )) as VoiceChannel;

      if (channel) {
        await interaction.member.voice.setChannel(channel);
        return interaction.update({
          content: `คุณได้เข้าร่วมห้อง ${channel.name} เรียบร้อยแล้ว`,
        });
      } else {
        return interaction.update({
          content: 'ไม่พบห้องที่คุณต้องการเข้าร่วม',
        });
      }
    } else {
      return interaction.update({
        content: 'ไม่สามารถย้ายสมาชิกนี้ไปยังห้องเสียงได้',
      });
    }
  }

  @StringSelect('SELECT_MENU_GAME')
  public async onSelectMenuPlayMode(
    @Context() [interaction]: StringSelectContext,
  ) {
    if (!(await this.isUserConnectedToVoiceChannel(interaction))) {
      return;
    }

    const user = interaction.user;
    this.storeSelectedValues('select_menu_game', user.id, interaction.values);

    return interaction.update({
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('SELECT_MENU_PLAY_MODE')
            .setPlaceholder('เลือกรูปแบบการเล่น')
            .setMaxValues(1)
            .setMinValues(1)
            .setOptions([
              // {
              //   label: 'โหมดจัดอันดับ',
              //   value: 'RANKED',
              // },
              {
                label: 'โหมดปกติ',
                value: 'NORMAL',
              },
              {
                label: 'กำหนดเอง',
                value: 'CUSTOM',
              },
            ]),
        ),
      ],
    });
  }

  @StringSelect('SELECT_MENU_PLAY_MODE')
  public async onSelectMenuPlayRangedMode(
    @Context() [interaction]: StringSelectContext,
  ) {
    if (!(await this.isUserConnectedToVoiceChannel(interaction))) {
      return;
    }

    const user = interaction.user;
    this.storeSelectedValues(
      'select_menu_play_mode',
      user.id,
      interaction.values,
    );

    const check_no_range = interaction.values[0] === 'NORMAL';
    const game_uid = this.selectedValues.find(
      (value) => value.key === 'select_menu_game' && value.user === user.id,
    )?.value;

    if (check_no_range) {
      const game_name = await this.gameRepository.getGameById(game_uid);
      const room_name = ` ${game_name.game_name} `;

      if (game_name) {
        return this.createAndMoveToVoiceChannel(interaction, room_name);
      }
    }

    const check_custom = interaction.values[0] === 'CUSTOM';
    if (check_custom) {
      return interaction.update({
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('SELECT_MENU_PLAY_RANGED_MODE_CUSTOM')
              .setPlaceholder('เลือกจำนวนผู้เล่น')
              .setMaxValues(1)
              .setMinValues(1)
              .setOptions([
                {
                  label: '10',
                  value: '10',
                },
                {
                  label: '20',
                  value: '20',
                },
                {
                  label: '50',
                  value: '50',
                },
                {
                  label: 'ไม่จำกัด',
                  value: 'UNLIMITED',
                },
              ]),
          ),
        ],
      });
    }

    const game_rank = await this.gameRankRepository.getGamesRank(game_uid);

    if (!game_rank.length) {
      // console.log(384, " game_rank : ", game_rank, " game_rank : ", game_uid);
      return interaction.update({
        components: [],
        content: 'ไม่พบระดับการเล่นสําหรับเกมนี้',
      });
    }

    return interaction.update({
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('SELECT_MENU_PLAY_RANGED_MODE')
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

  @StringSelect('SELECT_MENU_PLAY_RANGED_MODE')
  public async onSelectMenuManyPeoplePlay(
    @Context() [interaction]: StringSelectContext,
  ) {
    if (!(await this.isUserConnectedToVoiceChannel(interaction))) {
      return;
    }

    const user = interaction.user;
    this.storeSelectedValues(
      'select_menu_play_ranged_mode',
      user.id,
      interaction.values,
    );

    const game_uid = this.selectedValues.find(
      (value) => value.key === 'select_menu_game' && value.user === user.id,
    )?.value;

    // console.log('game_uid', game_uid);

    const gameRank = await this.gameRankRepository.getGamesRankByID(
      interaction.values[0],
    );
    const game_condition_match =
      await this.gameConditionMatchRepository.getGamesConditionMatchByGameId(
        game_uid,
        Number(gameRank.number),
      );

    if (!game_condition_match.length) {
      return interaction.update({
        components: [],
        content: 'ไม่พบจำนวนผู้เล่นสําหรับเกมนี้',
      });
    }

    return interaction.update({
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('SELECT_MENU_PEOPLE')
            .setPlaceholder('เลือกจำนวนผู้เล่น')
            .setMaxValues(1)
            .setMinValues(1)
            .setOptions(
              game_condition_match.map((game) => ({
                label: game.maxParty.toString(),
                value: game.id,
              })),
            ),
        ),
      ],
    });
  }

  @StringSelect('SELECT_MENU_PEOPLE')
  public async onSelectPeople(@Context() [interaction]: StringSelectContext) {
    if (!(await this.isUserConnectedToVoiceChannel(interaction))) {
      return;
    }

    const user = interaction.user;
    this.storeSelectedValues('select_menu_people', user.id, interaction.values);
    // console.log('this.selectedValues', this.selectedValues);

    const game_uid = this.selectedValues.find(
      (value) => value.key === 'select_menu_game' && value.user === user.id,
    )?.value;

    // console.log('game_uid', game_uid);

    const game_name = await this.gameRepository.getGameById(game_uid);

    if (!game_name) {
      return interaction.update({
        components: [],
        content: 'ไม่พบเกมส์นี้',
      });
    }
    const room_name = ` ${game_name.game_name} `;

    const game_condition_match =
      await this.gameConditionMatchRepository.getGamesConditionMatchById(
        interaction.values[0],
      );

    if (game_name) {
      return this.createAndMoveToVoiceChannel(
        interaction,
        room_name,
        Number(game_condition_match.maxParty),
      );
    }
  }
  @StringSelect('SELECT_MENU_PLAY_RANGED_MODE_CUSTOM')
  public async onSelectPeopleCustom(
    @Context() [interaction]: StringSelectContext,
  ) {
    if (!(await this.isUserConnectedToVoiceChannel(interaction))) {
      return;
    }

    const user = interaction.user;
    this.storeSelectedValues('select_menu_people', user.id, interaction.values);

    const game_uid = this.selectedValues.find(
      (value) => value.key === 'select_menu_game' && value.user === user.id,
    )?.value;

    const game_name = await this.gameRepository.getGameById(game_uid);

    if (!game_name) {
      return interaction.update({
        components: [],
        content: 'ไม่พบเกมส์นี้',
      });
    }
    const room_name = ` ${game_name.game_name} `;

    if (game_name) {
      return this.createAndMoveToVoiceChannel(
        interaction,
        room_name,
        interaction.values[0] === 'UNLIMITED'
          ? 0
          : Number(interaction.values[0]),
      );
    }
  }
}
