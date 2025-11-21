import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MusicBotStatus, ServerMusicBotStatus } from '@prisma/client';

@Injectable()
export class MusicBotService {
    private readonly logger = new Logger(MusicBotService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * หา Music Bot ที่ว่างตามจำนวนที่ต้องการ
     * @param count จำนวน bot ที่ต้องการ
     * @returns รายการ Music Bot ที่พร้อมใช้งาน
     */
    async getAvailableBots(count: number) {
        this.logger.debug(`[getAvailableBots] Requesting ${count} bots`);

        const bots = await this.prisma.musicBotDB.findMany({
            where: {
                isActive: true,
                OR: [
                    { status: MusicBotStatus.AVAILABLE },
                    {
                        status: MusicBotStatus.ASSIGNED,
                        currentGuilds: { lt: this.prisma.musicBotDB.fields.maxGuilds },
                    },
                ],
            },
            orderBy: [
                { currentGuilds: 'asc' }, // เลือก bot ที่มี guild น้อยที่สุดก่อน
                { createdAt: 'asc' },
            ],
            take: count,
        });

        if (bots.length < count) {
            this.logger.warn(
                `[getAvailableBots] Only found ${bots.length} bots, but requested ${count}`,
            );
        }

        return bots;
    }

    /**
     * Assign Music Bots ให้กับ Guild
     * @param guildId Discord Guild ID
     * @param botCount จำนวน bot ที่ต้องการ
     * @param userId Discord User ID ของผู้ที่ทำการ assign
     * @returns รายการ bot ที่ assign สำเร็จ
     */
    async assignBotsToGuild(guildId: string, botCount: number, userId?: string) {
        this.logger.log(`[assignBotsToGuild] Assigning ${botCount} bots to guild ${guildId}`);

        // ตรวจสอบว่ามี bot ที่ assign ไว้แล้วหรือไม่
        const existingAssignments = await this.prisma.serverMusicBotDB.findMany({
            where: {
                serverId: guildId,
                status: { in: [ServerMusicBotStatus.PENDING_INVITE, ServerMusicBotStatus.ACTIVE] },
            },
            include: { musicBot: true },
        });

        this.logger.debug(
            `[assignBotsToGuild] Found ${existingAssignments.length} existing assignments`,
        );

        // คำนวณจำนวน bot ที่ต้องเพิ่ม
        const neededBots = botCount - existingAssignments.length;

        if (neededBots <= 0) {
            this.logger.debug(
                `[assignBotsToGuild] Guild already has enough bots assigned (${existingAssignments.length})`,
            );
            return existingAssignments;
        }

        // หา bot ที่ว่าง
        const availableBots = await this.getAvailableBots(neededBots);

        if (availableBots.length === 0) {
            this.logger.warn(`[assignBotsToGuild] No available bots found`);
            return existingAssignments;
        }

        // Assign bots
        const newAssignments = await Promise.all(
            availableBots.map(async (bot) => {
                // สร้าง assignment record
                const assignment = await this.prisma.serverMusicBotDB.create({
                    data: {
                        serverId: guildId,
                        musicBotId: bot.id,
                        status: ServerMusicBotStatus.PENDING_INVITE,
                        invitedBy: userId,
                        createdBy: userId || 'system',
                        updatedBy: userId || 'system',
                    },
                    include: { musicBot: true },
                });

                // อัพเดทจำนวน guild ของ bot
                await this.updateBotGuildCount(bot.id);

                return assignment;
            }),
        );

        this.logger.log(
            `[assignBotsToGuild] Successfully assigned ${newAssignments.length} new bots`,
        );

        return [...existingAssignments, ...newAssignments];
    }

    /**
     * สร้าง Invite URLs สำหรับ Music Bots ที่ assign ให้ guild แล้ว
     * @param guildId Discord Guild ID
     * @returns รายการ invite URLs พร้อมข้อมูล bot
     */
    async generateInviteUrls(guildId: string) {
        const assignments = await this.prisma.serverMusicBotDB.findMany({
            where: {
                serverId: guildId,
                status: ServerMusicBotStatus.PENDING_INVITE,
            },
            include: { musicBot: true },
        });

        return assignments.map((assignment) => ({
            botName: assignment.musicBot.name,
            botId: assignment.musicBot.id,
            clientId: assignment.musicBot.clientId,
            inviteUrl: `${assignment.musicBot.inviteUrl}&guild_id=${guildId}`,
            assignmentId: assignment.id,
        }));
    }

    /**
     * เปลี่ยนสถานะ bot เป็น ACTIVE เมื่อ invite สำเร็จ
     * @param guildId Discord Guild ID
     * @param botClientId Discord Bot Client ID
     */
    async markBotAsActive(guildId: string, botClientId: string) {
        this.logger.log(`[markBotAsActive] Marking bot ${botClientId} as active in guild ${guildId}`);

        const bot = await this.prisma.musicBotDB.findUnique({
            where: { clientId: botClientId },
        });

        if (!bot) {
            this.logger.warn(`[markBotAsActive] Bot not found: ${botClientId}`);
            return null;
        }

        const assignment = await this.prisma.serverMusicBotDB.updateMany({
            where: {
                serverId: guildId,
                musicBotId: bot.id,
                status: ServerMusicBotStatus.PENDING_INVITE,
            },
            data: {
                status: ServerMusicBotStatus.ACTIVE,
                activatedAt: new Date(),
                updatedBy: 'system',
            },
        });

        this.logger.log(`[markBotAsActive] Updated ${assignment.count} assignments`);
        return assignment;
    }

    /**
     * ลบ Music Bots ออกจาก Guild
     * @param guildId Discord Guild ID
     */
    async removeBotsFromGuild(guildId: string) {
        this.logger.log(`[removeBotsFromGuild] Removing bots from guild ${guildId}`);

        const assignments = await this.prisma.serverMusicBotDB.findMany({
            where: {
                serverId: guildId,
                status: { in: [ServerMusicBotStatus.PENDING_INVITE, ServerMusicBotStatus.ACTIVE] },
            },
        });

        await Promise.all(
            assignments.map(async (assignment) => {
                await this.prisma.serverMusicBotDB.update({
                    where: { id: assignment.id },
                    data: {
                        status: ServerMusicBotStatus.REMOVED,
                        removedAt: new Date(),
                        updatedBy: 'system',
                    },
                });

                // อัพเดทจำนวน guild ของ bot
                await this.updateBotGuildCount(assignment.musicBotId);
            }),
        );

        this.logger.log(`[removeBotsFromGuild] Removed ${assignments.length} bots`);
        return assignments;
    }

    /**
     * ดึงรายการ Music Bots ที่ assign ให้ guild
     * @param guildId Discord Guild ID
     * @returns รายการ bot assignments
     */
    async getGuildMusicBots(guildId: string) {
        return this.prisma.serverMusicBotDB.findMany({
            where: {
                serverId: guildId,
                status: { in: [ServerMusicBotStatus.PENDING_INVITE, ServerMusicBotStatus.ACTIVE] },
            },
            include: { musicBot: true },
            orderBy: { assignedAt: 'asc' },
        });
    }

    /**
     * อัพเดทจำนวน guild และสถานะของ Music Bot
     * @param botId Music Bot ID
     */
    private async updateBotGuildCount(botId: string) {
        const activeCount = await this.prisma.serverMusicBotDB.count({
            where: {
                musicBotId: botId,
                status: { in: [ServerMusicBotStatus.PENDING_INVITE, ServerMusicBotStatus.ACTIVE] },
            },
        });

        const bot = await this.prisma.musicBotDB.findUnique({
            where: { id: botId },
        });

        if (!bot) return;

        let newStatus: MusicBotStatus;
        if (activeCount === 0) {
            newStatus = MusicBotStatus.AVAILABLE;
        } else if (activeCount >= bot.maxGuilds) {
            newStatus = MusicBotStatus.FULL;
        } else {
            newStatus = MusicBotStatus.ASSIGNED;
        }

        await this.prisma.musicBotDB.update({
            where: { id: botId },
            data: {
                currentGuilds: activeCount,
                status: newStatus,
                updatedBy: 'system',
            },
        });

        this.logger.debug(
            `[updateBotGuildCount] Bot ${bot.name} now has ${activeCount} guilds (status: ${newStatus})`,
        );
    }

    /**
     * ดึงสถิติ Music Bot Pool
     */
    async getBotPoolStats() {
        const total = await this.prisma.musicBotDB.count({
            where: { isActive: true },
        });

        const available = await this.prisma.musicBotDB.count({
            where: {
                isActive: true,
                status: MusicBotStatus.AVAILABLE,
            },
        });

        const assigned = await this.prisma.musicBotDB.count({
            where: {
                isActive: true,
                status: MusicBotStatus.ASSIGNED,
            },
        });

        const full = await this.prisma.musicBotDB.count({
            where: {
                isActive: true,
                status: MusicBotStatus.FULL,
            },
        });

        return {
            total,
            available,
            assigned,
            full,
        };
    }
}
