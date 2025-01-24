import { Injectable } from '@nestjs/common';
import { GameMatchDB } from '@prisma/client';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  GuildMember,
  StringSelectMenuBuilder,
  VoiceChannel,
} from 'discord.js';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class GameJoinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: Client,
  ) {}

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

  async onGameJoin(interaction: ChatInputCommandInteraction) {
    const gameType = interaction.options.get('game-type')?.value as string;
    const rankMode = interaction.options.get('rank-mode')?.value as string;

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
      const inter = await interaction.reply({ components: [gameSelect], ephemeral: true });
      inter.createMessageComponentCollector({
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
              `^🎮・\\s*${game.game_name}\\s*${rankMode ? '' : 'NORMAL'}`,
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
