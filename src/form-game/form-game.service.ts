import { Injectable, Logger } from '@nestjs/common';
import { UserDB } from '@prisma/client';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  GuildMember,
  ModalSubmitInteraction,
} from 'discord.js';
import { Button, ButtonContext, Context, Modal, ModalContext } from 'necord';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { isValidEmail } from 'src/utils/validEmail';

@Injectable()
export class FormGameService {
  private readonly logger = new Logger(FormGameService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) {}
  public onModuleInit() {
    this.logger.log('FormRegisterService initialized');
  }

  async createGameMessage(interaction: any) {
    try {
      // ดึงข้อมูลเซิร์ฟเวอร์จากฐานข้อมูล
      const server = await this.prisma.serverDB.findUnique({
        where: { serverId: interaction.guildId },
      });

      // ตรวจสอบว่ามี registerChannel เก่าหรือไม่
      if (server?.registerChannel) {
        const oldChannel = await interaction.guild?.channels
          .fetch(server.registerChannel)
          .catch(() => null);
        if (oldChannel) {
          await oldChannel.delete().catch((e) => {
            this.logger.warn(`ไม่สามารถลบห้องเก่าได้: ${e.message}`);
          });
        }
      }

      // บันทึกห้องใหม่ที่ใช้คำสั่งลง registerChannel
      await this.prisma.serverDB.update({
        where: { serverId: interaction.guildId },
        data: { registerChannel: interaction.channelId },
      });

      // สร้าง Embed ข้อความลงทะเบียน
      const embeds = new EmbedBuilder()
        .setTitle('𝑴𝒆𝑮𝒖𝒊𝒍𝒅 𝑮𝒂𝒎𝒆𝒔 𝑪𝒆𝒏𝒕𝒆𝒓')
        .setDescription('- สร้างห้องแขทเพื่อเล่นเกมส์"')
        .setColor(10513407)
        .setImage(
          'https://media.discordapp.net/attachments/855643137716650015/1287768914490691627/DALLE_2024-09-23_20.33.10_-_A_vibrant_fantasy-themed_banner_with_the_text_Game_Center_displayed_prominently._The_background_includes_a_magical_battlefield_scene_with_elements_l.webp?ex=66f2bfc2&is=66f16e42&hm=e3f5bf29bc2d01cd93f4868ac6c2d655ee4893c90ecffa3b6bb5f01cae705147&=&animated=true&width=840&height=480',
        )
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/6521/6521996.png');

      // สร้างปุ่มลงทะเบียน
      const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder()
          .setCustomId('game-create-room')
          .setEmoji('🎮') // ไอคอนสำหรับ "สร้างการจับคู่เกม"
          .setLabel('สร้างการจับคู่เกม')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('game-join')
          .setEmoji('🕹️') // ไอคอนสำหรับ "เข้าร่วมเกมธรรมดา"
          .setLabel('เข้าร่วมเกม')
          .setStyle(ButtonStyle.Primary),
      );

      // ส่ง Embed ลงทะเบียนไปยังห้องที่ใช้คำสั่ง
      const channel = interaction.channel as TextChannel;
      return channel.send({
        embeds: [embeds],
        components: [actionRow],
      });
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการสร้างข้อความลงทะเบียน', error);
      return interaction.reply({
        content: 'เกิดข้อผิดพลาดในการสร้างข้อความลงทะเบียน',
        ephemeral: true,
      });
    }
  }
}
