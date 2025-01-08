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
import { isValidEmail } from 'src/utils/validEmail';

@Injectable()
export class PrototypeService {
  private readonly logger = new Logger(PrototypeService.name);
  constructor(private readonly prisma: PrismaService) { }
  public onModuleInit() {
    this.logger.log('Prototype initialized');
  }

  async PrototypeSystem(interaction: any) {
    this.logger.log('รันตัวต้นแบบ');
    return interaction.reply({
      content: 'รันตัวต้นแบบสำเร็จ',
      ephemeral: true,
    });
    
  }
}
