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
import { isValidEmail } from 'src/utils/validEmail';

@Injectable()
export class RegisterServerService {
  private readonly logger = new Logger(RegisterServerService.name);
  constructor(private readonly prisma: PrismaService) { }
  public onModuleInit() {
    this.logger.log('RegisterServer initialized');
  }

  async RegisterServerSystem(interaction: any) {
    const guild = interaction.guild as Guild;

    if (!guild) {
      return interaction.reply(interaction, "ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้", "error", true);
    }

    return interaction.reply({
      content: `ลงทะเบียน ${guild.id} : ${guild.ownerId} : ${interaction.user.id} : ${guild.name} DiscordServer เรียบร้อย`,
      ephemeral: true,
    });
  }
}
