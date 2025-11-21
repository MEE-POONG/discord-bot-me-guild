import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { ServerRepository } from 'src/repository/server';

@Injectable()
export class ExpirationNotificationService {
    private readonly logger = new Logger(ExpirationNotificationService.name);

    constructor(
        private readonly serverRepository: ServerRepository,
        private readonly client: Client,
    ) { }

    public onModuleInit() {
        this.logger.log('ExpirationNotificationService initialized');
        this.logger.log('Cron job scheduled: Daily at 9:00 AM');
    }

    /**
     * Cron job that runs daily at 9:00 AM to check for expiring servers
     * and send notifications to server owners
     */
    @Cron('0 9 * * *', {
        name: 'check-expiring-servers',
        timeZone: 'Asia/Bangkok', // UTC+7
    })
    async checkExpiringServers() {
        this.logger.log('[Cron] Checking for servers expiring in 1 day...');

        try {
            const expiringServers = await this.serverRepository.getServersExpiringInOneDay();

            if (expiringServers.length === 0) {
                this.logger.log('[Cron] No servers expiring in 1 day');
                return;
            }

            this.logger.log(`[Cron] Found ${expiringServers.length} server(s) expiring in 1 day`);

            for (const server of expiringServers) {
                try {
                    await this.sendExpirationNotification(server.serverId, server.serverName, server.openUntilAt);
                    this.logger.log(`[Cron] Notification sent to server: ${server.serverName} (${server.serverId})`);
                } catch (error) {
                    this.logger.error(
                        `[Cron] Failed to send notification to server ${server.serverId}: ${error.message || error}`,
                    );
                }
            }

            this.logger.log('[Cron] Expiration check completed');
        } catch (error) {
            this.logger.error(`[Cron] Error checking expiring servers: ${error}`);
        }
    }

    /**
     * Send expiration notification to the system channel (🕍︰me-guild-center)
     */
    private async sendExpirationNotification(
        serverId: string,
        serverName: string,
        expiryDate: Date,
    ): Promise<void> {
        try {
            // Get the Discord guild
            const guild = await this.client.guilds.fetch(serverId);
            if (!guild) {
                this.logger.warn(`[Notification] Guild not found: ${serverId}`);
                return;
            }

            // Find the system channel (🕍︰me-guild-center)
            const systemChannel = guild.channels.cache.find(
                (channel) => channel.name === '🕍︰me-guild-center' && channel.isTextBased(),
            ) as TextChannel;

            if (!systemChannel) {
                this.logger.warn(`[Notification] System channel not found in guild: ${serverName} (${serverId})`);
                return;
            }

            // Calculate days remaining
            const now = new Date();
            const timeRemaining = expiryDate.getTime() - now.getTime();
            const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

            // Create notification embed
            const embed = new EmbedBuilder()
                .setTitle('⚠️ แจ้งเตือน: ใกล้หมดอายุการใช้งาน')
                .setDescription(
                    `**เซิร์ฟเวอร์ "${serverName}" ใกล้หมดอายุการใช้งานแล้ว!**\n\n` +
                    `📅 **วันหมดอายุ:** ${expiryDate.toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}\n` +
                    `⏰ **เวลาที่เหลือ:** ประมาณ ${hoursRemaining} ชั่วโมง\n\n` +
                    `💡 **วิธีต่ออายุ:**\n` +
                    `1. ใช้คำสั่ง \`/server-buy-package\` เพื่อซื้อแพ็คเกจใหม่\n` +
                    `2. หรือใช้โค้ดแพ็คเกจผ่านคำสั่ง \`/server-meguild-set\`\n\n` +
                    `⚠️ **หมายเหตุ:** หากไม่ต่ออายุ บอทจะหยุดให้บริการเมื่อหมดอายุ`,
                )
                .setColor(0xffa500) // Orange color for warning
                .setTimestamp()
                .setFooter({
                    text: '🔔 ระบบแจ้งเตือนอัตโนมัติ | MeGuild Bot',
                });

            // Send the notification
            await systemChannel.send({
                content: `<@${guild.ownerId}>`, // Mention the server owner
                embeds: [embed],
            });

            this.logger.log(`[Notification] Successfully sent to ${serverName} (${serverId})`);
        } catch (error) {
            this.logger.error(`[Notification] Error sending notification: ${error.message || error}`);
            throw error;
        }
    }

    /**
     * Manual trigger for testing purposes
     * Can be called via a command or endpoint
     */
    async manualCheckExpiringServers(): Promise<void> {
        this.logger.log('[Manual] Manually triggered expiration check');
        await this.checkExpiringServers();
    }
}
