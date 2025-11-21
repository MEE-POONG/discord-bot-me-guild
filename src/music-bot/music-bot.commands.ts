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

            // ดึงข้อมูลการใช้งาน Music Bot
            const usage = await this.musicBotService.getMusicBotUsage(guildId);
            const assignments = await this.musicBotService.getGuildMusicBots(guildId);

            // Log debug info
            this.logger.debug(
                `[handleMusicBotStatus] Guild: ${guildId}, Usage: ${usage.current}/${usage.limit}, Assignments: ${assignments.length}`,
            );

            if (assignments.length === 0) {
                // ตรวจสอบว่าเซิร์ฟเวอร์มีสิทธิ์ใช้ Music Bot หรือไม่
                if (usage.limit > 0 && Number.isFinite(usage.limit)) {
                    // มีสิทธิ์แต่ยังไม่มี bot ให้ assign
                    this.logger.log(
                        `[handleMusicBotStatus] Guild ${guildId} has limit ${usage.limit} but no bots assigned. Auto-assigning...`,
                    );

                    try {
                        // ตรวจสอบความถูกต้องของจำนวน bot
                        const botCount = Math.max(1, Math.min(usage.limit, 25)); // จำกัดระหว่าง 1-25
                        this.logger.debug(
                            `[handleMusicBotStatus] Assigning ${botCount} bots (original limit: ${usage.limit})`,
                        );

                        // Auto-assign Music Bots
                        await this.musicBotService.assignBotsToGuild(
                            guildId,
                            botCount,
                            interaction.user.id,
                        );

                        // ดึง invite URLs
                        const inviteUrls = await this.musicBotService.generateInviteUrls(guildId);

                        let description = `**การใช้งาน:** ${usage.current}/${usage.limit} ตัว\n\n` +
                            `✅ ระบบได้ assign Music Bot ให้เซิร์ฟเวอร์แล้ว **${inviteUrls.length}** ตัว\n\n` +
                            `🎵 **กรุณาเชิญ Music Bot เข้าเซิร์ฟเวอร์:**\n\n`;

                        inviteUrls.forEach((bot, index) => {
                            description += `${index + 1}. [${bot.botName}](${bot.inviteUrl})\n`;
                        });

                        description += `\n💡 **หมายเหตุ:** คุณต้องมีสิทธิ์ Administrator เพื่อเชิญ bot เข้าเซิร์ฟเวอร์`;

                        return interaction.editReply({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle('🎵 Music Bot Status - รอการเชิญเข้าเซิร์ฟเวอร์')
                                    .setDescription(description)
                                    .setColor(0x00ff00),
                            ],
                        });
                    } catch (error) {
                        this.logger.error('[handleMusicBotStatus] Failed to auto-assign bots:', error);
                        return interaction.editReply({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle('🎵 Music Bot Status')
                                    .setDescription(
                                        `**การใช้งาน:** ${usage.current}/${usage.limit} ตัว (${usage.percentage}%)\n\n` +
                                        '❌ เกิดข้อผิดพลาดในการ assign Music Bot\n\n' +
                                        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                    )
                                    .setColor(0xff0000),
                            ],
                        });
                    }
                }

                // ไม่มีสิทธิ์ใช้ Music Bot
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('🎵 Music Bot Status')
                            .setDescription(
                                `**การใช้งาน:** ${usage.current}/${usage.limit} ตัว (${usage.percentage}%)\n\n` +
                                'ยังไม่มี Music Bot ที่ assign ให้เซิร์ฟเวอร์นี้\n\n' +
                                'ใช้คำสั่ง `/server-buy-package` เพื่อซื้อแพ็คเกจที่มี Music Bot',
                            )
                            .setColor(0xffa500),
                    ],
                });
            }

            // สร้างแถบแสดงการใช้งาน
            const progressBar = this.createProgressBar(usage.current, usage.limit);
            const isOverLimit = usage.current > usage.limit;
            const usageEmoji = isOverLimit ? '🔴' : (usage.current >= usage.limit ? '🔴' : usage.current >= usage.limit * 0.8 ? '🟡' : '🟢');

            // นับจำนวน bot ที่รอการ invite
            const pendingCount = assignments.filter(a => a.status === 'PENDING_INVITE').length;
            const activeCount = assignments.filter(a => a.status === 'ACTIVE').length;

            let descriptionText = `${usageEmoji} **การใช้งาน:** ${usage.current}/${usage.limit} ตัว (${usage.percentage}%)\n` +
                `${progressBar}\n`;

            // แสดง status ตามสถานการณ์
            if (isOverLimit) {
                const excess = usage.current - usage.limit;
                descriptionText += `⚠️ **เกินขีดจำกัด ${excess} ตัว!** บางบอทอาจไม่ทำงานหรือถูกลบออกในอนาคต\n\n`;
            } else if (usage.available > 0) {
                descriptionText += `✅ เหลืออีก **${usage.available}** ตัวที่สามารถใช้งานได้\n\n`;
            } else {
                descriptionText += `⚠️ ใช้งานครบตามขีดจำกัดแล้ว\n\n`;
            }

            // แสดงสถิติ
            descriptionText += `📊 **สถิติ:** ใช้งาน ${activeCount} | รอเชิญ ${pendingCount} | รวม ${assignments.length} ตัว`;

            // ถ้ามี bot ที่รอการ invite ให้แสดงลิ้งด้านบน
            if (pendingCount > 0) {
                descriptionText += `\n\n🔗 **ลิ้งเชิญ Music Bot:**\n`;
                const pendingBots = assignments.filter(a => a.status === 'PENDING_INVITE');
                pendingBots.forEach((bot, index) => {
                    const inviteUrl = `${bot.musicBot.inviteUrl}&guild_id=${guildId}`;
                    descriptionText += `${index + 1}. [${bot.musicBot.name}](${inviteUrl})\n`;
                });
                descriptionText += `\n💡 ต้องมีสิทธิ์ Admin เพื่อเชิญ bot เข้าเซิร์ฟเวอร์`;
            }

            const embed = new EmbedBuilder()
                .setTitle('🎵 Music Bot Status')
                .setDescription(descriptionText)
                .setColor(usage.current >= usage.limit ? 0xff0000 : 0x00ff00);

            // แสดงรายละเอียด bot แต่ละตัว (ถ้ามีไม่เกิน 5 ตัว)
            if (assignments.length <= 5) {
                embed.addFields({
                    name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                    value: '**รายละเอียด Music Bot แต่ละตัว:**',
                    inline: false,
                });
            }

            // แสดงรายละเอียดแต่ละ bot (เฉพาะถ้ามีไม่เกิน 5 ตัว)
            if (assignments.length <= 5) {
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
            } else {
                // ถ้ามี bot เยอะเกิน 5 ตัว ให้แสดงแค่สรุป
                embed.addFields({
                    name: '📝 หมายเหตุ',
                    value: `เซิร์ฟเวอร์มี Music Bot มากกว่า 5 ตัว\nกรุณาตรวจสอบรายละเอียดในช่องต่างๆ ของเซิร์ฟเวอร์`,
                    inline: false,
                });
            }

            // เพิ่มข้อมูลสถิติ Bot Pool
            const stats = await this.musicBotService.getBotPoolStats();
            embed.setFooter({
                text: `Bot Pool: ${stats.available} Available | ${stats.assigned} Assigned | ${stats.full} Full | Total: ${stats.total}`,
            });

            // เพิ่มคำแนะนำตามสถานการณ์
            if (isOverLimit) {
                const excess = usage.current - usage.limit;
                embed.addFields({
                    name: '🚨 เกินขีดจำกัด!',
                    value: 
                        `คุณกำลังใช้งาน Music Bot เกินขีดจำกัด **${excess} ตัว**\n\n` +
                        `**แนะนำ:**\n` +
                        `1. อัพเกรด package ผ่านคำสั่ง \`/server-buy-package\`\n` +
                        `2. หรือซื้อ Music Bot Add-on เพิ่มเติม\n` +
                        `3. หรือลบ Music Bot บางตัวออกเพื่อให้พอดีกับขีดจำกัด`,
                    inline: false,
                });
            } else if (usage.available <= 1 && usage.available > 0) {
                embed.addFields({
                    name: '💡 คำแนะนำ',
                    value: 'Music Bot ของคุณใกล้เต็มแล้ว! พิจารณาอัพเกรด package หรือซื้อ Music Bot Add-on เพิ่มเติม',
                    inline: false,
                });
            } else if (usage.available === 0 && !isOverLimit) {
                embed.addFields({
                    name: '⚠️ ขีดจำกัดเต็ม',
                    value: 'คุณใช้งาน Music Bot ครบตามขีดจำกัดแล้ว\nใช้คำสั่ง `/server-buy-package` เพื่ออัพเกรด package หรือซื้อ Music Bot Add-on',
                    inline: false,
                });
            }

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            this.logger.error('[handleMusicBotStatus] Error:', error);
            return interaction.editReply({
                content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล Music Bot',
            });
        }
    }

    /**
     * สร้าง progress bar แสดงการใช้งาน Music Bot
     */
    private createProgressBar(current: number, max: number, length: number = 10): string {
        // ป้องกันการหาร 0
        if (max <= 0) {
            return `\`${'░'.repeat(length)}\``;
        }

        // คำนวณจำนวน filled characters
        const ratio = current / max;
        let filled = Math.round(ratio * length);
        
        // จำกัดไม่ให้เกิน length (กรณีที่ current > max)
        filled = Math.max(0, Math.min(filled, length));
        const empty = length - filled;
        
        const filledChar = '█';
        const emptyChar = '░';
        
        // ถ้าเกิน 100% ให้เปลี่ยนสีเป็นแดง
        if (ratio > 1) {
            return `\`${'🔴'.repeat(Math.min(filled, length))}\``;
        }
        
        return `\`${filledChar.repeat(filled)}${emptyChar.repeat(empty)}\``;
    }
}
