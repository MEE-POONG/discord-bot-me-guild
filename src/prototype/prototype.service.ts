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
import { validateServerAndRole } from 'src/utils/server-validation.util';

@Injectable()
export class PrototypeService {
  private readonly logger = new Logger(PrototypeService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) {}
  public onModuleInit() {
    this.logger.log('Prototype initialized');
  }

  async PrototypeSystem(interaction: any) {
    const roleCheck = 'admin'; // Required role for this command
    const validationError = await validateServerAndRole(
      interaction,
      roleCheck,
      this.serverRepository,
    );
    if (validationError) {
      return validationError; // Reply has already been handled
    }

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ ลงทะเบียนสำเร็จ') // หัวข้อ
          .setDescription(`🎉 เซิร์ฟเวอร์ เช็ค สำเร็จ `) // รายละเอียด
          .setColor(0x00ff00), // สีเขียว (สำเร็จ)
      ],
      ephemeral: true,
    });
  }
}
