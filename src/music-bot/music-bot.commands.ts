import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { EmbedBuilder } from 'discord.js';
import { MusicBotService } from './music-bot.service';

@Injectable()
export class MusicBotCommands {
    private readonly logger = new Logger(MusicBotCommands.name);

    constructor(private readonly musicBotService: MusicBotService) { }

    @SlashCommand({
        name: 'music-bot-status',
        description: 'ดูสถานะ Music Bots ที่ assign ให้เซิร์ฟเวอร์',
        defaultMemberPermissions: '8', // Administrator only
    })
    async handleMusicBotStatus(@Context() [interaction]: SlashCommandContext) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guildId = interaction.guildId;
            if (!guildId) {
                return interaction.editReply({
                    content: '❌ ไม่สามารถดึงข้อมูล Guild ID ได้',
                });
            }

            const assignments = await this.musicBotService.getGuildMusicBots(guildId);

            if (assignments.length === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('🎵 Music Bot Status')
                            .setDescription(
                                'ยังไม่มี Music Bot ที่ assign ให้เซิร์ฟเวอร์นี้\n\n' +
                                'ใช้คำสั่ง `/server-buy-package` เพื่อซื้อแพ็คเกจที่มี Music Bot',
                            )
                            .setColor(0xffa500),
                    ],
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('🎵 Music Bot Status')
                .setDescription(
                    `เซิร์ฟเวอร์นี้มี Music Bot ทั้งหมด **${assignments.length}** ตัว`,
                )
                .setColor(0x00ff00);

            for (const assignment of assignments) {
                const statusEmoji =
                    assignment.status === 'ACTIVE'
                        ? '✅'
                        : assignment.status === 'PENDING_INVITE'
                            ? '⏳'
                            : '❌';
                const statusText =
                    assignment.status === 'ACTIVE'
                        ? 'ใช้งานอยู่'
                        : assignment.status === 'PENDING_INVITE'
                            ? 'รอการ Invite'
                            : 'ไม่ทราบสถานะ';

                let fieldValue = `${statusEmoji} **สถานะ:** ${statusText}\n`;
                fieldValue += `🆔 **Client ID:** \`${assignment.musicBot.clientId}\`\n`;

                if (assignment.status === 'PENDING_INVITE') {
                    const inviteUrl = `${assignment.musicBot.inviteUrl}&guild_id=${guildId}`;
                    fieldValue += `\n🔗 [คลิกเพื่อ Invite Bot](${inviteUrl})`;
                } else if (assignment.activatedAt) {
                    fieldValue += `📅 **เข้าร่วมเมื่อ:** ${assignment.activatedAt.toLocaleDateString('th-TH')}`;
                }

                embed.addFields({
                    name: `${assignment.musicBot.name}`,
                    value: fieldValue,
                    inline: false,
                });
            }

            // เพิ่มข้อมูลสถิติ Bot Pool
            const stats = await this.musicBotService.getBotPoolStats();
            embed.setFooter({
                text: `Bot Pool: ${stats.available} Available | ${stats.assigned} Assigned | ${stats.full} Full | Total: ${stats.total}`,
            });

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            this.logger.error('[handleMusicBotStatus] Error:', error);
            return interaction.editReply({
                content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล Music Bot',
            });
        }
    }
}
