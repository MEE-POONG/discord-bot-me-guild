import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { ServerRepository } from 'src/repository/server';
import { ServerMeguildSetService } from 'src/server-meguild-set/server-meguild-set.service';
import { Guild, TextChannel } from 'discord.js';

@Injectable()
export class GuildEventsService {
    private readonly logger = new Logger(GuildEventsService.name);

    constructor(
        private readonly serverRepository: ServerRepository,
        private readonly serverMeguildSetService: ServerMeguildSetService,
    ) { }

    public onModuleInit() {
        this.logger.log('GuildEventsService initialized');
    }

    /**
     * Event handler when bot joins a new guild
     * Automatically registers the server and creates system channel
     */
    @On('guildCreate')
    public async onGuildCreate(@Context() [guild]: ContextOf<'guildCreate'>) {
        this.logger.log(
            `[onGuildCreate] Bot joined new guild: ${guild.name} (${guild.id})`,
        );

        try {
            // Check if server is already registered
            const existingServer = await this.serverRepository.getServerById(guild.id);

            if (existingServer) {
                this.logger.debug(
                    `[onGuildCreate] Server ${guild.name} is already registered`,
                );
                return;
            }

            // Auto-register the server
            this.logger.log(`[onGuildCreate] Auto-registering server: ${guild.name}`);
            const newServer = await this.serverRepository.ServerRegister(
                guild.id,
                guild.name,
                guild.ownerId,
            );

            if (newServer) {
                this.logger.log(
                    `[onGuildCreate] Successfully registered server: ${guild.name} (${guild.id})`,
                );

                // Try to create system channel
                try {
                    const owner = await guild.fetchOwner();
                    const systemChannel = await this.serverMeguildSetService.createSystemChannel(
                        guild,
                        owner.user,
                    );

                    this.logger.log(
                        `[onGuildCreate] Created system channel: ${systemChannel.name} (${systemChannel.id})`,
                    );

                    // Send welcome message to system channel
                    await this.sendWelcomeMessage(systemChannel as TextChannel, guild);
                } catch (channelError) {
                    this.logger.error(
                        `[onGuildCreate] Failed to create system channel: ${channelError.message || channelError}`,
                    );
                    // Don't fail the entire registration if channel creation fails
                    // The owner can manually create it later
                }
            } else {
                this.logger.error(
                    `[onGuildCreate] Failed to register server: ${guild.name}`,
                );
            }
        } catch (error) {
            this.logger.error(
                `[onGuildCreate] Error handling guild create event: ${error}`,
            );
        }
    }

    /**
     * Send welcome message to the system channel
     */
    private async sendWelcomeMessage(channel: TextChannel, guild: Guild) {
        try {
            await channel.send({
                embeds: [
                    {
                        title: '🎉 ยินดีต้อนรับสู่ MeGuild Bot!',
                        description:
                            `**ขอบคุณที่เชิญ MeGuild Bot เข้าสู่เซิร์ฟเวอร์ "${guild.name}"**\n\n` +
                            `✅ เซิร์ฟเวอร์ของคุณได้รับการลงทะเบียนอัตโนมัติแล้ว!\n\n` +
                            `**ขั้นตอนถัดไป:**\n` +
                            `1. 📦 ซื้อแพ็คเกจหรือกรอกโค้ดแพ็คเกจเพื่อเปิดใช้งาน\n` +
                            `2. ⚙️ ตั้งค่าห้องและระบบต่างๆ ตามต้องการ\n` +
                            `3. 🎮 เริ่มใช้งาน Bot ได้เลย!\n\n` +
                            `💡 **เคล็ดลับ:** ใช้ปุ่มด้านล่างเพื่อเริ่มต้นใช้งาน`,
                        color: 0x00ff00,
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: '🔒 เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้นที่สามารถเห็นห้องนี้',
                        },
                    },
                ],
            });

            this.logger.log(
                `[sendWelcomeMessage] Sent welcome message to ${channel.name}`,
            );
        } catch (error) {
            this.logger.error(
                `[sendWelcomeMessage] Failed to send welcome message: ${error}`,
            );
        }
    }

    /**
     * Event handler when bot is removed from a guild
     * Optionally update server status or log the event
     */
    @On('guildDelete')
    public async onGuildDelete(@Context() [guild]: ContextOf<'guildDelete'>) {
        this.logger.log(
            `[onGuildDelete] Bot removed from guild: ${guild.name} (${guild.id})`,
        );

        // Optionally: Update server status in database
        // For now, just log the event
        // You can add logic here to mark the server as inactive if needed
    }
}
