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
import { PrismaService } from 'src/prisma.service';

const CATEGORY_TITLE = 'แนวเกมส์';
const ITEMS_PER_PAGE = 5;

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
            .setContent(
              `หน้า ${page}/${Math.ceil(gameTypes.total / gameTypes.limit)}`,
            )
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

  private async collectVoiceChannels(
    interCollect: any,
  ): Promise<VoiceChannel[]> {
    const channelData: VoiceChannel[] = [];
    interCollect.guild.channels.cache.forEach((channel) => {
      if (channel instanceof VoiceChannel) {
        channelData.push(channel);
      }
    });

    return channelData;
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

  @StringSelect('GAME_JOIN_SELECT_MENU_GAME_TYPE')
  public async onSelectMenu(@Context() [interaction]: StringSelectContext) {
    if (!(await this.isUserConnectedToVoiceChannel(interaction))) {
      return;
    }

    this.storeSelectedValues(
      'GAME_JOIN_SELECT_MENU_GAME_TYPE',
      interaction.user.id,
      interaction.values,
    );

    return interaction.update({
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('GAME_JOIN_SELECT_MENU_PLAY_MODE')
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
    });
  }

  @StringSelect('GAME_JOIN_SELECT_MENU_PLAY_MODE')
  public async onSelectMenuPlayMode(
    @Context() [interaction]: StringSelectContext,
  ) {
    const gameType = this.selectedValues.find(
      (value) =>
        value.key === 'GAME_JOIN_SELECT_MENU_GAME_TYPE' &&
        value.user === interaction.user.id,
    )?.value;
    const rankMode = interaction.values[0];

    console.log(gameType, rankMode);
    
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

    const gameInType = await this.prisma.gameTypeGame.findMany({
      where: {
        typeId: gameType,
      },
    });

    const gameOnline = await this.prisma.gameOnlineDB.findMany({
      where: {
        id: {
          in: gameInType.map((game) => game.gameId),
        },
      },
    });

    if (!gameOnline || gameOnline.length < 1) {
      return interaction.reply({
        content: 'ไม่พบข้อมูลเกมในประเภทนี้',
        ephemeral: true,
      });
    }

    const gameSelectId = `gameSelect_${await this.randomNumber(1000, 9999)}`;
    const gameSelect =
      new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
        new StringSelectMenuBuilder()
          .setCustomId(gameSelectId)
          .setMaxValues(1)
          .setMinValues(1)
          .setPlaceholder('กรุณาเลือกเกม')
          .setOptions(
            gameOnline.map((game) => ({
              value: game.id,
              label: game.game_name,
            })),
          ),
      );

    try {
      const inter = await interaction.update({
        components: [gameSelect],
      });
      inter
        .createMessageComponentCollector({
          filter: (i) =>
            i.user.id === interaction.user.id && i.customId === gameSelectId,
          max: 1,
          time: 60 * 1000 * 5,
        })
        .on('collect', async (interCollect) => {
          if (interCollect.isStringSelectMenu()) {
            const gameId = interCollect.values[0];
            try {
              const game = await this.prisma.gameOnlineDB.findFirst({
                where: { id: gameId },
              });

              if (!game) {
                return await interCollect.reply({
                  content: 'ไม่พบข้อมูลเกม',
                  ephemeral: true,
                });
              }

              const channelData = await this.collectVoiceChannels(interCollect);
              const matchGameChanel = new RegExp(
                `^🎮・\\s*${game.game_name}\\s*${rankMode === 'RANKED' ? '' : 'NORMAL'}`,
              );

              const gameChannel = channelData.filter((channel) =>
                matchGameChanel.test(channel.name),
              );

              if (gameChannel.length < 1) {
                return await interCollect.reply({
                  content: 'ยังไม่มีสมาชิกสร้างห้องเล่นเกมนี้',
                  ephemeral: true,
                });
              }

              const selectedChannel =
                gameChannel[Math.floor(Math.random() * gameChannel.length)];
              await member.voice.setChannel(selectedChannel);
              await interCollect.reply({
                content: `เข้าร่วมห้องเกมส์ ${selectedChannel.name} แล้ว`,
                ephemeral: true,
              });
            } catch (error) {
              console.error('Error moving member to voice channel:', error);
              await interCollect.reply({
                content: 'เกิดข้อผิดพลาดในการเข้าร่วมห้องเกมส์',
                ephemeral: true,
              });
            }
          }
        })
        .on('end', () => {
          inter.delete().catch(() => {});
        });
    } catch (err) {
      console.log('GameJoinService: ', err);
    }
  }

  private async randomNumber(min: number, max: number): Promise<number> {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async createEmbedForRoom(roomIndex: number, rooms: VoiceChannel[]) {
    const room = rooms[roomIndex];
    const embed = new EmbedBuilder().setDescription(
      `ห้อง : <#${room.id}>\nผู้สร้าง : <@${room.members.first()?.id}>`,
    );
    embed.addFields(
      { name: 'ขนาดปาร์ตี้', value: `${room.members.size}`, inline: true },
      {
        name: 'ขนาดปาร์ตี้สูงสุด',
        value: `${room.members.size}`,
        inline: true,
      },
    );

    return embed;
  }

  async createActionRow(
    currentIndex: number,
    game_id: string,
    rooms: VoiceChannel[],
  ) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`previous_${currentIndex}_${game_id}`)
        .setDisabled(currentIndex === 0)
        .setEmoji('⬅')
        .setLabel('ย้อนกลับ')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`join_${rooms[currentIndex].id}`)
        .setDisabled(false)
        .setEmoji('✅')
        .setLabel('เข้าร่วม')
        .setDisabled(
          rooms[currentIndex].members.size === rooms[currentIndex].members.size,
        )
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`next_${currentIndex}_${game_id}`)
        .setDisabled(currentIndex === rooms.length - 1)
        .setEmoji('➡')
        .setLabel('ถัดไป')
        .setStyle(ButtonStyle.Secondary),
    );
  }
}
