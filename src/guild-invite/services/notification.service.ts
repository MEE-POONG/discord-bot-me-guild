import { Injectable, Logger } from '@nestjs/common';
import { GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder } from 'discord.js';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendInviteNotification(
    target: GuildMember,
    inviter: string,
    guildName: string,
    buttons: ActionRowBuilder<ButtonBuilder>
  ): Promise<boolean> {
    const startTime = Date.now();
    this.logger.log(`[DEBUG] Starting sendInviteNotification - Target: ${target.id}, Inviter: ${inviter}`);

    try {
      const embeds = new EmbedBuilder()
        .setAuthor({
          name: `มีคำเชิญเข้าร่วมกิลด์จาก ${inviter}`,
        })
        .setFields({
          name: `ชื่อกิลด์`,
          value: `${guildName ?? 'ไม่ระบุชื่อกิลด์'}`,
        })
        .setColor('#A4FFED');

      this.logger.log(`[DEBUG] Sending DM to target - Target: ${target.id}`);
      await target.user.send({
        embeds: [embeds],
        components: [buttons],
      });

      this.logger.log(`[DEBUG] DM sent successfully - Target: ${target.id}`);
      return true;
    } catch (error) {
      this.logger.error(
        `[DEBUG] Error sending DM - Target: ${target.id}, Error: ${error.message}`,
      );
      return false;
    } finally {
      const endTime = Date.now();
      this.logger.log(
        `[DEBUG] sendInviteNotification completed - Target: ${target.id}, Duration: ${endTime - startTime}ms`,
      );
    }
  }
}
