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
    this.logger.debug(`[ServerclearSystem] Starting server clear for user: ${interaction.user.id} (${interaction.user.username})`);
    const roleCheck = 'admin';
    this.logger.debug(`[ServerclearSystem] Validating server and role: ${roleCheck}`);
    const validationError = await validateServerAndRole(
      interaction,
      roleCheck,
      this.serverRepository,
    );
    if (validationError) {
      this.logger.warn(`[ServerclearSystem] Validation failed:`, validationError);
      return validationError;
    }
    this.logger.debug(`[ServerclearSystem] Validation passed`);

    const guild: Guild = interaction.guild;
    this.logger.debug(`[ServerclearSystem] Guild: ${guild?.name} (${guild?.id})`);

    if (!guild) {
      this.logger.error(`[ServerclearSystem] No guild found`);
      return interaction.editReply({
        content: '❌ ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้',
      });
    }

    // ✅ เพิ่มเงื่อนไขตรวจสอบเจ้าของเซิร์ฟเวอร์
    this.logger.debug(`[ServerclearSystem] Checking ownership: guild.ownerId=${guild.ownerId}, user.id=${interaction.user.id}`);
    if (guild.ownerId !== interaction.user.id) {
      this.logger.warn(`[ServerclearSystem] User ${interaction.user.id} is not the owner of guild ${guild.id}`);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⛔ ข้อผิดพลาดในการเข้าถึง')
            .setDescription('🔒 คำสั่งนี้สามารถใช้งานได้เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้น')
            .setColor(0xff0000),
        ],
      });
    }

    try {
      this.logger.debug(`[ServerclearSystem] Starting channel deletion process`);
      const channels = guild.channels.cache;
      const excludeChannels = ['test', 'rules', 'moderator-only'];
      this.logger.debug(`[ServerclearSystem] Found ${channels.size} channels, excluding: ${excludeChannels.join(', ')}`);

      let testChannel = channels.find(
        (channel) => channel.name === 'test' && channel.isTextBased(),
      );
      this.logger.debug(`[ServerclearSystem] Test channel found: ${testChannel ? testChannel.name : 'none'}`);

      for (const [channelId, channel] of channels) {
        if (excludeChannels.includes(channel.name)) {
          this.logger.debug(`[ServerclearSystem] Skipped deleting channel: ${channel.name} (${channelId})`);
          continue;
        }

        try {
          this.logger.debug(`[ServerclearSystem] Deleting channel: ${channel.name} (${channelId})`);
          await channel.delete(`Deleted by ${interaction.user.tag}`);
          this.logger.log(`[ServerclearSystem] Deleted channel: ${channel.name} (${channelId})`);
        } catch (err) {
          this.logger.error(
            `[ServerclearSystem] Failed to delete channel ${channel.name} (${channelId}): ${err.message}`,
          );
        }
      }

      if (!testChannel) {
        this.logger.debug(`[ServerclearSystem] Creating test channel`);
        testChannel = await guild.channels.create({
          name: 'test',
          type: 0,
          reason: `Created by ${interaction.user.tag} after clearing other channels`,
        });

        this.logger.log(`[ServerclearSystem] Created channel: ${testChannel.name} (${testChannel.id})`);
      }

      this.logger.debug(`[ServerclearSystem] Sending success response`);
      return interaction.editReply({
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
      });
    } catch (error) {
      this.logger.error(`[ServerclearSystem] Error deleting channels: ${error.message}`, error);
      return interaction.editReply({
        content: '❌ เกิดข้อผิดพลาดระหว่างการลบห้อง กรุณาลองใหม่อีกครั้ง',
      });
    }
  }
}
