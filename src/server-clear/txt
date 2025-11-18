import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder, Guild, TextChannel, PermissionFlagsBits } from 'discord.js';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole } from 'src/utils/server-validation.util';

@Injectable()
export class ServerClearService {
  private readonly logger = new Logger(ServerClearService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) {}

  public onModuleInit() {
    this.logger.log('ServerClear initialized');
  }

  async ServerClearSystem(interaction: any) {
    this.logger.debug(
      `[ServerClearSystem] Starting server clear for user: ${interaction.user.id} (${interaction.user.username})`,
    );
    const roleCheck = 'admin';
    this.logger.debug(`[ServerClearSystem] Validating server and role: ${roleCheck}`);
    const validationError = await validateServerAndRole(
      interaction,
      roleCheck,
      this.serverRepository,
    );
    if (validationError) {
      this.logger.warn(`[ServerClearSystem] Validation failed:`, validationError);
      return validationError;
    }
    this.logger.debug(`[ServerClearSystem] Validation passed`);

    const guild: Guild = interaction.guild;
    this.logger.debug(`[ServerClearSystem] Guild: ${guild?.name} (${guild?.id})`);

    if (!guild) {
      this.logger.error(`[ServerClearSystem] No guild found`);
      return interaction.editReply({
        content: '❌ ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้',
      });
    }

    // ✅ เพิ่มเงื่อนไขตรวจสอบเจ้าของเซิร์ฟเวอร์
    this.logger.debug(
      `[ServerClearSystem] Checking ownership: guild.ownerId=${guild.ownerId}, user.id=${interaction.user.id}`,
    );
    if (guild.ownerId !== interaction.user.id) {
      this.logger.warn(
        `[ServerClearSystem] User ${interaction.user.id} is not the owner of guild ${guild.id}`,
      );
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
      this.logger.debug(`[ServerClearSystem] Starting channel deletion process`);
      const channels = guild.channels.cache;
      const excludeChannels = ['Me-Guild-Set-Server', 'rules', 'moderator-only'];
      this.logger.debug(
        `[ServerClearSystem] Found ${channels.size} channels, excluding: ${excludeChannels.join(', ')}`,
      );

      let meguildChannel = channels.find(
        (channel) => channel.name === 'Me-Guild-Set-Server' && channel.isTextBased(),
      );
      this.logger.debug(
        `[ServerClearSystem] Me-Guild-Set-Server channel found: ${meguildChannel ? meguildChannel.name : 'none'}`,
      );

      for (const [channelId, channel] of channels) {
        if (excludeChannels.includes(channel.name)) {
          this.logger.debug(
            `[ServerClearSystem] Skipped deleting channel: ${channel.name} (${channelId})`,
          );
          continue;
        }

        try {
          this.logger.debug(`[ServerClearSystem] Deleting channel: ${channel.name} (${channelId})`);
          await channel.delete(`Deleted by ${interaction.user.tag}`);
          this.logger.log(`[ServerClearSystem] Deleted channel: ${channel.name} (${channelId})`);
        } catch (err) {
          this.logger.error(
            `[ServerClearSystem] Failed to delete channel ${channel.name} (${channelId}): ${err.message}`,
          );
        }
      }

      if (!meguildChannel) {
        this.logger.debug(`[ServerClearSystem] Creating Me-Guild-Set-Server channel`);
        // กำหนดให้แอดมินเท่านั้นที่เห็นห้องนี้
        meguildChannel = await guild.channels.create({
          name: 'Me-Guild-Set-Server',
          type: 0,
          reason: `Created by ${interaction.user.tag} after clearing other channels`,
          permissionOverwrites: [
            {
              id: guild.id, // @everyone role
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.user.id, // Channel creator (server owner)
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels,
              ],
            },
          ],
        });

        this.logger.log(
          `[ServerClearSystem] Created channel: ${meguildChannel.name} (${meguildChannel.id})`,
        );
      }

      this.logger.debug(`[ServerClearSystem] Sending success response`);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ ลบห้องสำเร็จ')
            .setDescription(
              `🎉 ห้องทั้งหมดในเซิร์ฟเวอร์ถูกลบเรียบร้อยแล้ว (ยกเว้นห้องที่ได้รับการยกเว้น)\n` +
                `- ยกเว้น: "Me-Guild-Set-Server", "rules", และ "moderator-only"\n` +
                `ห้อง "Me-Guild-Set-Server" ถูกสร้างใหม่ถ้ายังไม่มี`,
            )
            .setColor(0x00ff00),
        ],
      });
    } catch (error) {
      this.logger.error(`[ServerClearSystem] Error deleting channels: ${error.message}`, error);
      return interaction.editReply({
        content: '❌ เกิดข้อผิดพลาดระหว่างการลบห้อง กรุณาลองใหม่อีกครั้ง',
      });
    }
  }
}
