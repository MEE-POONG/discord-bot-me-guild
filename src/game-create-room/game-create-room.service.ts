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
  SelectMenuBuilder,
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
} from 'discord.js';
import { GameTypeRepository } from 'src/game-type/game-type.repository';
import { GameRepository } from 'src/game/game.repository';
import { GameRankRepository } from 'src/game-rank/game-rank.repository';
import { GameConditionMatchRepository } from 'src/game-condition-match/game-condition-match.repository';

const CATEGORY_TITLE = 'แนวเกมส์';
const ITEMS_PER_PAGE = 5;

const game_lists = Array.from({ length: 1000 }, (_, i) => ({
  label: `เกมส์ชื่อ ${i + 1}`,
  value: `game_name_${i + 1}`,
})).slice(0, 100);

@Injectable()
export class GameCreateRoomService implements OnModuleInit {
  private readonly logger = new Logger(GameCreateRoomService.name);
  private selectedValues: { key: string; value: string }[] = [];
  private client: Client;
  private party_id: string;

  public constructor(
    private readonly paginationService: NecordPaginationService,
    private readonly gameTypeRepository: GameTypeRepository,
    private readonly gameRepository: GameRepository,
    private readonly gameRankRepository: GameRankRepository,
    private readonly gameConditionMatchRepository: GameConditionMatchRepository,
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
              new ActionRowBuilder<SelectMenuBuilder>().addComponents(
                new SelectMenuBuilder()
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

  private storeSelectedValues(key: string, values: string[]) {
    this.selectedValues.push({ key, value: values.join(' ') });
  }

  @StringSelect('SELECT_MENU_GAME_CREATE_ROOM')
  public async onSelectMenu(@Context() [interaction]: StringSelectContext) {
    const user = interaction.user;

    this.storeSelectedValues('game_create_room', interaction.values);
    this.storeSelectedValues('user_id', [user.id]);
    this.storeSelectedValues('user_name', [user.username]);
    this.storeSelectedValues('user_display_name', [user.displayName]);
    this.storeSelectedValues('user_tag', [user.tag]);
    this.storeSelectedValues('user_avatar', [user.avatarURL()]);
    this.storeSelectedValues('user_created_at', [user.createdAt.toISOString()]);

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
              new ActionRowBuilder<SelectMenuBuilder>().addComponents(
                new SelectMenuBuilder()
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

    return interaction.reply({ ...page, ephemeral: true });
  }

  @StringSelect('SELECT_MENU_GAME')
  public async onSelectMenuGame(@Context() [interaction]: StringSelectContext) {
    this.storeSelectedValues('select_menu_game', interaction.values);
    return interaction.reply({
      components: [
        new ActionRowBuilder<SelectMenuBuilder>().addComponents(
          new SelectMenuBuilder()
            .setCustomId('SELECT_MENU_MODE')
            .setPlaceholder('มี Range หรือไม่')
            .setMaxValues(1)
            .setMinValues(1)
            .setOptions([
              {
                label: 'มี Range',
                value: 'HAS_RANGE',
              },
              {
                label: 'ไม่มี Range',
                value: 'NO_RANGE',
              },
            ]),
        ),
      ],
      ephemeral: true,
    });
  }

  private async createAndMoveToVoiceChannel(
    interaction: StringSelectMenuInteraction<CacheType>,
    gameName: string,
    limit: number = 0,
  ) {
    if (interaction.member instanceof GuildMember) {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: 'คุณต้องเชื่อมต่อกับช่องเสียงก่อน',
          ephemeral: true,
        });
      }

      const game_uid = this.selectedValues.find(
        (value) => value.key === 'select_menu_game',
      )?.value;
      const game = await this.gameRepository.getGameById(game_uid);

      const channel = await interaction.guild?.channels.create({
        name: `🎮 ${gameName} - PARTY`,
        type: ChannelType.GuildVoice,
        userLimit: limit || Number(game?.partyLimit),
        parent: interaction.guild.channels.cache.get(
          process.env.DISCORD_GUILD_CHANEL_ID,
        ) as CategoryChannel,
      });

      if (channel) {
        await interaction.member.voice.setChannel(channel);
        this.party_id = channel.id;
        const channel_text = await this.client.channels.fetch(
          process.env.DISCORD_GUILD_CHANEL_PARTY_ID,
        );
        if (
          channel_text &&
          (channel_text instanceof TextChannel ||
            channel_text instanceof DMChannel ||
            channel_text instanceof NewsChannel)
        ) {
          await channel_text.send({
            content: `เข้าร่วมห้องเกมส์ ${channel.name}`,
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId(`JOIN_PARTY`)
                  .setLabel(`เข้าร่วมห้อง ${channel.name}`)
                  .setStyle(ButtonStyle.Primary),
              ),
            ],
          });
        }
      }

      return interaction.reply({
        content: `สร้างห้องเกมส์ ${channel.name} เรียบร้อย`,
        ephemeral: true,
      });
    } else {
      return interaction.reply({
        content: 'ไม่สามารถตั้งค่าช่องเสียงสำหรับสมาชิกนี้ได้',
        ephemeral: true,
      });
    }
  }

  @Button('JOIN_PARTY')
  public async onJoinParty(@Context() [interaction]: ButtonContext) {
    if (interaction.member instanceof GuildMember) {
      const channelId = this.party_id;
      const channel = (await this.client.channels.fetch(
        channelId,
      )) as VoiceChannel;

      if (channel) {
        await interaction.member.voice.setChannel(channel);
        return interaction.reply({
          content: `คุณได้เข้าร่วมห้อง ${channel.name} เรียบร้อยแล้ว`,
          ephemeral: true,
        });
      } else {
        return interaction.reply({
          content: 'ไม่พบห้องที่คุณต้องการเข้าร่วม',
          ephemeral: true,
        });
      }
    } else {
      return interaction.reply({
        content: 'ไม่สามารถย้ายสมาชิกนี้ไปยังห้องเสียงได้',
        ephemeral: true,
      });
    }
  }

  @StringSelect('SELECT_MENU_MODE')
  public async onSelectMenuPlayMode(
    @Context() [interaction]: StringSelectContext,
  ) {
    this.storeSelectedValues('select_menu_mode', interaction.values);

    const check_no_range = interaction.values[0] === 'NO_RANGE';
    if (check_no_range) {
      const game_uid = this.selectedValues.find(
        (value) => value.key === 'select_menu_game',
      )?.value;
      const game_name = await this.gameRepository.getGameById(game_uid);
      const room_name = ` ${game_name.game_name} `;

      if (game_uid) {
        return this.createAndMoveToVoiceChannel(interaction, room_name);
      }
    }

    return interaction.reply({
      components: [
        new ActionRowBuilder<SelectMenuBuilder>().addComponents(
          new SelectMenuBuilder()
            .setCustomId('SELECT_MENU_PLAY_MODE')
            .setPlaceholder('เลือกรูปแบบการเล่น')
            .setMaxValues(1)
            .setMinValues(1)
            .setOptions([
              {
                label: 'โหมดจัดอันดับ',
                value: 'RANKED',
              },
              {
                label: 'โหมดปกติ',
                value: 'NORMAL',
              },
            ]),
        ),
      ],
      ephemeral: true,
    });
  }

  @StringSelect('SELECT_MENU_PLAY_MODE')
  public async onSelectMenuPlayRangedMode(
    @Context() [interaction]: StringSelectContext,
  ) {
    this.storeSelectedValues('select_menu_play_mode', interaction.values);

    const check_no_range = interaction.values[0] === 'NORMAL';
    const game_uid = this.selectedValues.find(
      (value) => value.key === 'select_menu_game',
    )?.value;
    if (check_no_range) {
      const game_name = await this.gameRepository.getGameById(game_uid);
      const room_name = ` ${game_name.game_name} `;

      if (game_name) {
        return this.createAndMoveToVoiceChannel(interaction, room_name);
      }
    }

    const game_rank = await this.gameRankRepository.getGamesRank(game_uid);
    return interaction.reply({
      components: [
        new ActionRowBuilder<SelectMenuBuilder>().addComponents(
          new SelectMenuBuilder()
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
      ephemeral: true,
    });
  }

  @StringSelect('SELECT_MENU_PLAY_RANGED_MODE')
  public async onSelectMenuManyPeoplePlay(
    @Context() [interaction]: StringSelectContext,
  ) {
    this.storeSelectedValues(
      'select_menu_play_ranged_mode',
      interaction.values,
    );

    const game_uid = this.selectedValues.find(
      (value) => value.key === 'select_menu_game',
    )?.value;
    const game_condition_match =
      await this.gameConditionMatchRepository.getGamesConditionMatchByGameId(
        game_uid,
      );
    return interaction.reply({
      components: [
        new ActionRowBuilder<SelectMenuBuilder>().addComponents(
          new SelectMenuBuilder()
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
      ephemeral: true,
    });
  }

  @StringSelect('SELECT_MENU_PEOPLE')
  public async onSelectPeople(@Context() [interaction]: StringSelectContext) {
    this.storeSelectedValues('select_menu_people', interaction.values);

    const game_uid = this.selectedValues.find(
      (value) => value.key === 'select_menu_game',
    )?.value;
    const game_name = await this.gameRepository.getGameById(game_uid);
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
}
