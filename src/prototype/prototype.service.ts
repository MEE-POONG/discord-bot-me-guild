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
  Guild,
} from 'discord.js';
import { Button, ButtonContext, Context, Modal, ModalContext } from 'necord';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';

@Injectable()
export class PrototypeService {
  private readonly logger = new Logger(PrototypeService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) { } public onModuleInit() {
    this.logger.log('Prototype initialized');
  }

  async PrototypeSystem(interaction: any) {
    let checkStep = `เริ่ม `;
    const guild = interaction.guild as Guild;
    if (!guild) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ ข้อผิดพลาดในการดึงข้อมูล')
            .setDescription('ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์จาก Discord ได้')
            .setColor(0xff0000) // สีแดง
        ],
        ephemeral: true,
      });
    } else {
      checkStep += ` Guild`;
    }

    const existingServer = await this.serverRepository.getServerById(guild.id);

    // ตรวจสอบเงื่อนไข
    if (!existingServer) {
      // ไม่พบการลงทะเบียน DiscordServer
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ ไม่พบการลงทะเบียน')
            .setDescription(`เซิร์ฟเวอร์ "${guild.name}" ยังไม่ได้ลงทะเบียนในระบบ`)
            .setColor(0xff0000) // สีแดง
        ],
        ephemeral: true,
      });
    } else {
      checkStep += ` register`;

    }

    if (existingServer.serverName !== guild.name || existingServer.ownerId !== guild.ownerId) {
      // พบความไม่ถูกต้องจากข้อมูลทะเบียน
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚠️ พบความไม่ถูกต้อง')
            .setDescription(
              `ข้อมูลเซิร์ฟเวอร์ไม่ตรงกับข้อมูลในระบบ:\n` +
              `**ชื่อเซิร์ฟเวอร์:** "${guild.name}"\n` +
              `**เจ้าของ:** ${guild.ownerId}`
            )
            .setColor(0xffa500) // สีส้ม
        ],
        ephemeral: true,
      });
    } else {
      checkStep += ` discord`;

    }

    // เข็คใช่เจ้าของไหม
    if (guild.ownerId !== interaction.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⛔ ข้อผิดพลาดในการเข้าถึง')
            .setDescription('🔒 คำสั่งนี้สามารถใช้งานได้เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้น')
            .setColor(0xff0000) // สีแดง
        ],
        ephemeral: true,
      });
    } else {
      checkStep += ` owner`;
    }

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ ลงทะเบียนสำเร็จ') // หัวข้อ
          .setDescription(`🎉 เซิร์ฟเวอร์ เช็ค สำเร็จ : ${checkStep}`) // รายละเอียด
          .setColor(0x00ff00) // สีเขียว (สำเร็จ)
      ],
      ephemeral: true,
    });

  }
}
