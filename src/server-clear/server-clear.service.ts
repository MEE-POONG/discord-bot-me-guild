import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder, Guild, TextChannel } from 'discord.js';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole } from 'src/utils/server-validation.util';

@Injectable()
export class ServerclearService {
  private readonly logger = new Logger(ServerclearService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) {}

  public onModuleInit() {
    this.logger.log('Serverclear initialized');
  }

  async ServerclearSystem(interaction: any) {
    const roleCheck = 'admin';
    const validationError = await validateServerAndRole(
      interaction,
      roleCheck,
      this.serverRepository,
    );
    if (validationError) {
      return validationError;
    }

    const guild: Guild = interaction.guild;

    if (!guild) {
      return interaction.reply({
        content: '❌ ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้',
        ephemeral: true,
      });
    }

    // ✅ เพิ่มเงื่อนไขตรวจสอบเจ้าของเซิร์ฟเวอร์
    if (guild.ownerId !== interaction.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⛔ ข้อผิดพลาดในการเข้าถึง')
            .setDescription('🔒 คำสั่งนี้สามารถใช้งานได้เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้น')
            .setColor(0xff0000),
        ],
        ephemeral: true,
      });
    }

    try {
      const channels = guild.channels.cache;
      const excludeChannels = ['test', 'rules', 'moderator-only'];

      let testChannel = channels.find(
        (channel) => channel.name === 'test' && channel.isTextBased(),
      );

      for (const [channelId, channel] of channels) {
        if (excludeChannels.includes(channel.name)) {
          this.logger.log(`Skipped deleting channel: ${channel.name} (${channelId})`);
          continue;
        }

        try {
          await channel.delete(`Deleted by ${interaction.user.tag}`);
          this.logger.log(`Deleted channel: ${channel.name} (${channelId})`);
        } catch (err) {
          this.logger.error(
            `❌ Failed to delete channel ${channel.name} (${channelId}): ${err.message}`,
          );
        }
      }

      if (!testChannel) {
        testChannel = await guild.channels.create({
          name: 'test',
          type: 0,
          reason: `Created by ${interaction.user.tag} after clearing other channels`,
        });

        this.logger.log(`Created channel: ${testChannel.name} (${testChannel.id})`);
      }

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
