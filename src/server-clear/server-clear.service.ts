import { Injectable, Logger } from '@nestjs/common';
import {
  EmbedBuilder,
  Guild,
  TextChannel,
} from 'discord.js';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole } from 'src/utils/server-validation.util';

@Injectable()
export class ServerclearService {
  private readonly logger = new Logger(ServerclearService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) { }

  public onModuleInit() {
    this.logger.log('Serverclear initialized');
  }

  async ServerclearSystem(interaction: any) {
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

      // Fetch all channels in the guild
      const channels = guild.channels.cache;

      // Check if "test" channel exists
      let testChannel = channels.find(channel => channel.name === 'test' && channel.isTextBased());

      // Channels to exclude from deletion
      const excludeChannels = ['test', 'rules', 'moderator-only'];

      // Delete all channels except excluded channels
      for (const [channelId, channel] of channels) {
        if (excludeChannels.includes(channel.name)) {
          this.logger.log(`Skipped deleting channel: ${channel.name} (${channelId})`);
          continue;
        }
        await channel.delete(`Deleted by ${interaction.user.tag}`);
        this.logger.log(`Deleted channel: ${channel.name} (${channelId})`);
      }

      // If "test" channel does not exist, create it
      if (!testChannel) {
        testChannel = await guild.channels.create({
          name: 'test',
          type: 0, // Text Channel
          reason: `Created by ${interaction.user.tag} after clearing other channels`,
        });

        this.logger.log(`Created channel: ${testChannel.name} (${testChannel.id})`);
      }

      // Reply to confirm operation
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ ลบห้องสำเร็จ')
            .setDescription(
              `🎉 ห้องทั้งหมดในเซิร์ฟเวอร์ถูกลบเรียบร้อยแล้ว (ยกเว้นห้องที่ได้รับการยกเว้น)\n` +
              `- ยกเว้น: "test", "rules", และ "moderator-only"\n` +
              `ห้อง "test" ถูกสร้างใหม่ถ้ายังไม่มี`,
            )
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
