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
     * @param guildId (Optional) Guild ID เพื่อแยก bot ที่ assign ไว้แล้วออก
     * @param excludeBotIds (Optional) Bot IDs ที่ต้องการแยกออก (เช่น bot ที่ถูก reactivate แล้ว)
     * @returns รายการ Music Bot ที่พร้อมใช้งาน
     */
    async getAvailableBots(count: number, guildId?: string, excludeBotIds: string[] = []) {
        this.logger.debug(`[getAvailableBots] Requesting ${count} bots for guild ${guildId || 'any'}`);

        // หา bot IDs ที่ assign ให้ guild นี้แล้ว (รวมทุก status เพื่อป้องกัน unique constraint error)
        let assignedBotIds: string[] = [...excludeBotIds];
        if (guildId) {
            const assignedBots = await this.prisma.serverMusicBotDB.findMany({
                where: { 
                    serverId: guildId,
                },
                select: { musicBotId: true },
            });
            assignedBotIds = [...assignedBotIds, ...assignedBots.map(ab => ab.musicBotId)];
            this.logger.debug(
                `[getAvailableBots] Found ${assignedBots.length} bots already assigned to this guild`,
            );
        }

        const bots = await this.prisma.musicBotDB.findMany({
            where: {
                isActive: true,
                ...(assignedBotIds.length > 0 ? { id: { notIn: assignedBotIds } } : {}),
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

        // ตรวจสอบข้อมูลเซิร์ฟเวอร์
        const server = await this.prisma.serverDB.findUnique({
            where: { serverId: guildId },
        });

        if (!server) {
            this.logger.warn(`[assignBotsToGuild] Server not found: ${guildId}`);
            throw new Error('เซิร์ฟเวอร์ไม่ได้ลงทะเบียนในระบบ');
        }

        // ตรวจสอบว่าจำนวนที่ขอไม่เกินขีดจำกัด
        const maxBots = (server as any).maxMusicBots || 1;
        if (botCount > maxBots) {
            this.logger.warn(
                `[assignBotsToGuild] Requested ${botCount} bots but server limit is ${maxBots}`,
            );
            throw new Error(
                `เซิร์ฟเวอร์นี้สามารถใช้ Music Bot ได้สูงสุด ${maxBots} ตัว (ตาม package ที่ซื้อ)\n` +
                `กรุณาอัพเกรด package หรือซื้อ Music Bot Add-on เพิ่มเติม`,
            );
        }

        // ตรวจสอบว่ามี bot ที่ assign ไว้แล้วหรือไม่
        const existingAssignments = await this.prisma.serverMusicBotDB.findMany({
            where: {
                serverId: guildId,
                status: { in: [ServerMusicBotStatus.PENDING_INVITE, ServerMusicBotStatus.ACTIVE] },
            },
            include: { musicBot: true },
        });

        this.logger.debug(
            `[assignBotsToGuild] Found ${existingAssignments.length} existing assignments (limit: ${maxBots})`,
        );

        // คำนวณจำนวน bot ที่ต้องเพิ่ม
        const neededBots = botCount - existingAssignments.length;

        if (neededBots <= 0) {
            this.logger.debug(
                `[assignBotsToGuild] Guild already has enough bots assigned (${existingAssignments.length})`,
            );
            return existingAssignments;
        }

        // 1. หา bot ที่เคย assign ไว้แล้วแต่ถูก REMOVED (เพื่อ reuse)
        const removedAssignments = await this.prisma.serverMusicBotDB.findMany({
            where: {
                serverId: guildId,
                status: ServerMusicBotStatus.REMOVED,
            },
            include: { musicBot: true },
            take: neededBots,
        });

        const reactivatedAssignments: any[] = [];
        
        // Reactivate bot ที่เคย assign ไว้แล้ว
        if (removedAssignments.length > 0) {
            this.logger.log(
                `[assignBotsToGuild] Reactivating ${removedAssignments.length} previously removed bots`,
            );

            for (const removed of removedAssignments) {
                const reactivated = await this.prisma.serverMusicBotDB.update({
                    where: { id: removed.id },
                    data: {
                        status: ServerMusicBotStatus.PENDING_INVITE,
                        invitedBy: userId,
                        assignedAt: new Date(),
                        activatedAt: null,
                        removedAt: null,
                        updatedBy: userId || 'system',
                    },
                    include: { musicBot: true },
                });

                // อัพเดทจำนวน guild ของ bot
                await this.updateBotGuildCount(removed.musicBotId);

                reactivatedAssignments.push(reactivated);
            }
        }

        // 2. ถ้ายังไม่พอ หา bot ใหม่
        const stillNeeded = neededBots - reactivatedAssignments.length;
        const newAssignments: any[] = [];

        if (stillNeeded > 0) {
            // หา bot ที่ว่าง (ยกเว้น bot ที่ assign ให้ guild นี้แล้ว)
            const availableBots = await this.getAvailableBots(stillNeeded, guildId);

            if (availableBots.length === 0) {
                this.logger.warn(`[assignBotsToGuild] No available bots found`);
                return [...existingAssignments, ...reactivatedAssignments];
            }

            this.logger.log(
                `[assignBotsToGuild] Assigning ${availableBots.length} new bots`,
            );

            // Assign bots ใหม่
            for (const bot of availableBots) {
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

                newAssignments.push(assignment);
            }
        }

        const totalAssignments = [
            ...existingAssignments,
            ...reactivatedAssignments,
            ...newAssignments,
        ];

        this.logger.log(
            `[assignBotsToGuild] Successfully assigned ${reactivatedAssignments.length} reactivated + ${newAssignments.length} new bots. Total: ${totalAssignments.length}`,
        );

        return totalAssignments;
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

    /**
     * ตรวจสอบจำนวน Music Bot ที่ใช้งานอยู่และขีดจำกัด
     * @param guildId Discord Guild ID
     * @returns ข้อมูลการใช้งาน Music Bot
     */
    async getMusicBotUsage(guildId: string) {
        const server = await this.prisma.serverDB.findUnique({
            where: { serverId: guildId },
        });

        if (!server) {
            throw new Error('เซิร์ฟเวอร์ไม่ได้ลงทะเบียนในระบบ');
        }

        const activeCount = await this.prisma.serverMusicBotDB.count({
            where: {
                serverId: guildId,
                status: { in: [ServerMusicBotStatus.PENDING_INVITE, ServerMusicBotStatus.ACTIVE] },
            },
        });

        const maxBots = (server as any).maxMusicBots || 1;
        
        // Validate และแก้ไขค่า maxBots ที่ไม่ถูกต้อง
        const validMaxBots = Number.isFinite(maxBots) && maxBots > 0 ? maxBots : 1;
        const safeActiveCount = Math.max(0, activeCount);
        const available = Math.max(0, validMaxBots - safeActiveCount);
        const percentage = validMaxBots > 0 ? Math.round((safeActiveCount / validMaxBots) * 100) : 0;

        this.logger.debug(
            `[getMusicBotUsage] Guild ${guildId}: current=${safeActiveCount}, limit=${validMaxBots}, available=${available}`,
        );

        return {
            current: safeActiveCount,
            limit: validMaxBots,
            available: available,
            percentage: percentage,
        };
    }

    /**
     * ตรวจสอบว่าเซิร์ฟเวอร์สามารถเพิ่ม Music Bot ได้หรือไม่
     * @param guildId Discord Guild ID
     * @param additionalCount จำนวน bot ที่ต้องการเพิ่ม
     * @returns true ถ้าสามารถเพิ่มได้
     */
    async canAddMusicBots(guildId: string, additionalCount: number = 1): Promise<boolean> {
        const usage = await this.getMusicBotUsage(guildId);
        return usage.current + additionalCount <= usage.limit;
    }

    /**
     * เพิ่มขีดจำกัด Music Bot สำหรับเซิร์ฟเวอร์ (เมื่อซื้อ add-on)
     * @param guildId Discord Guild ID
     * @param additionalBots จำนวน bot ที่เพิ่ม
     */
    async increaseMusicBotLimit(guildId: string, additionalBots: number) {
        this.logger.log(
            `[increaseMusicBotLimit] Increasing limit for guild ${guildId} by ${additionalBots}`,
        );

        const server = await this.prisma.serverDB.findUnique({
            where: { serverId: guildId },
        });

        if (!server) {
            throw new Error('เซิร์ฟเวอร์ไม่ได้ลงทะเบียนในระบบ');
        }

        const currentMax = (server as any).maxMusicBots || 1;
        await this.prisma.serverDB.update({
            where: { serverId: guildId },
            data: {
                maxMusicBots: currentMax + additionalBots,
            } as any,
        });

        this.logger.log(
            `[increaseMusicBotLimit] New limit: ${currentMax + additionalBots}`,
        );
    }
}
