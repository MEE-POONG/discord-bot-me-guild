import { Injectable, Logger } from '@nestjs/common';
import {
  EmbedBuilder,
  Guild,
  GuildChannel,
} from 'discord.js';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole } from 'src/utils/server-validation.util';

@Injectable()
export class PrototypeService {
  private readonly logger = new Logger(PrototypeService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) { }
  public onModuleInit() {
    this.logger.log('Prototype initialized');
  }

  async PrototypeSystem(interaction: any) {
    const roleCheck = 'admin'; // Required role for this command
    const validationError = await validateServerAndRole(interaction, roleCheck, this.serverRepository);
    if (validationError) {
      return validationError; // Reply has already been handled
    }

    try {
      const guild: Guild = interaction.guild;

      if (!guild) {
        return interaction.reply({
          content: '❌ ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้',
          ephemeral: true,
        });
      }

      // // Fetch all channels in the guild
      // const channels = guild.channels.cache;

      // // Loop through and delete each channel
      // for (const [channelId, channel] of channels) {
      //   await channel.delete(`Deleted by ${interaction.user.tag}`);
      //   this.logger.log(`Deleted channel: ${channel.name} (${channelId})`);
      // }

      // // Reply to confirm deletion
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ ลบห้องสำเร็จ')
            .setDescription(`🎉 ห้องทั้งหมดในเซิร์ฟเวอร์ถูกลบเรียบร้อยแล้ว`)
            .setColor(0x00ff00),
        ],
        ephemeral: true,
      });
    } catch (error) {
      this.logger.error(`Error deleting channels: ${error.message}`);
      return interaction.reply({
        content: '❌ เกิดข้อผิดพลาดระหว่างการลบห้อง กรุณาลองใหม่อีกครั้ง',
        ephemeral: true,
      });
    }
  }
}
