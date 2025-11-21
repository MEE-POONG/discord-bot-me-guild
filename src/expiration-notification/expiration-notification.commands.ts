import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { ExpirationNotificationService } from './expiration-notification.service';

@Injectable()
export class ExpirationNotificationCommands {
    private readonly logger = new Logger(ExpirationNotificationCommands.name);

    constructor(
        private readonly expirationNotificationService: ExpirationNotificationService,
    ) { }

    @SlashCommand({
        name: 'test-expiration-notification',
        description: '[Admin] ทดสอบระบบแจ้งเตือนก่อนหมดอายุ',
    })
    async testExpirationNotification(@Context() [interaction]: SlashCommandContext) {
        await interaction.deferReply({ ephemeral: true });

        try {
            this.logger.log(`[Test] Manual trigger by ${interaction.user.tag}`);

            // Trigger the expiration check manually
            await this.expirationNotificationService.manualCheckExpiringServers();

            return interaction.editReply({
                content: '✅ **ทดสอบระบบแจ้งเตือนเสร็จสิ้น**\n\nตรวจสอบ log และห้อง 🕍︰me-guild-center ของเซิร์ฟเวอร์ที่ใกล้หมดอายุ',
            });
        } catch (error) {
            this.logger.error(`[Test] Error: ${error}`);
            return interaction.editReply({
                content: `❌ **เกิดข้อผิดพลาด**\n\n${error.message || error}`,
            });
        }
    }
}
