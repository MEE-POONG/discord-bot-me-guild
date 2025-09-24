import { Injectable, Logger } from '@nestjs/common';
import { ChatInputCommandInteraction, CacheType, Guild, GuildMember } from 'discord.js';
import { PrismaService } from 'src/prisma.service';
import { UserProfile } from 'src/guild-manage/guild-manage.service';

export interface InviteResult {
  status: 'success' | 'fail';
  message: string;
  inviteId: string | null;
}

export interface InviteData {
  userId: string;
  targetId: string;
  inviteId: string;
  member: any;
  guild: any;
}

@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name);
  private readonly inviteData = new Map<string, InviteData>();

  constructor(private readonly prisma: PrismaService) {}

  async createInvite(
    userData: UserProfile,
    interaction: ChatInputCommandInteraction<CacheType>,
  ): Promise<InviteResult> {
    const startTime = Date.now();
    this.logger.log(
      `[DEBUG] Starting createInvite - UserData: ${userData.discord_id}, Inviter: ${interaction.user.id}`,
    );

    try {
      this.logger.log(`[DEBUG] Finding inviter's guild - Inviter: ${interaction.user.id}`);
      const owner = await this.prisma.guildMembers.findFirst({
        where: {
          userId: interaction.user.id,
        },
        include: {
          guildDB: true,
        },
      });

      if (!owner || !owner.guildDB) {
        this.logger.log(`[DEBUG] Inviter not found or no guild - Inviter: ${interaction.user.id}`);
        return {
          status: 'fail',
          message: 'ไม่พบข้อมูลกิลด์ของคุณ',
          inviteId: null,
        };
      }

      this.logger.log(
        `[DEBUG] Creating invite in DB - GuildId: ${owner.guildDB.id}, UserId: ${userData.discord_id}, Inviter: ${interaction.user.id}`,
      );
      const invite = await this.prisma.guildInviteDataDB.create({
        data: {
          guildId: owner.guildDB.id,
          userId: userData.discord_id,
        },
      });

      this.logger.log(
        `[DEBUG] Invite created successfully - InviteId: ${invite.id}, GuildId: ${owner.guildDB.id}, UserId: ${userData.discord_id}`,
      );
      return {
        status: 'success',
        message: 'สร้างคำเชิญสำเร็จ',
        inviteId: invite.id,
      };
    } catch (error) {
      this.logger.error(
        `[DEBUG] Error in createInvite - UserData: ${userData.discord_id}, Inviter: ${interaction.user.id}, Error: ${error.message}, Stack: ${error.stack}`,
      );
      return {
        status: 'fail',
        message: 'ไม่สามารถสร้างคำเชิญได้',
        inviteId: null,
      };
    } finally {
      const endTime = Date.now();
      this.logger.log(
        `[DEBUG] createInvite completed - UserData: ${userData.discord_id}, Inviter: ${interaction.user.id}, Duration: ${endTime - startTime}ms`,
      );
    }
  }

  async acceptInvite(inviteId: string, userId: string): Promise<InviteResult> {
    const startTime = Date.now();
    this.logger.log(`[DEBUG] Starting acceptInvite - InviteId: ${inviteId}, User: ${userId}`);

    try {
      this.logger.log(
        `[DEBUG] Finding guild invite data in DB - InviteId: ${inviteId}, User: ${userId}`,
      );
      const guildInviteDataDB = await this.prisma.guildInviteDataDB.findFirst({
        where: { id: inviteId },
      });

      if (!guildInviteDataDB) {
        this.logger.log(
          `[DEBUG] Guild invite data not found in DB - InviteId: ${inviteId}, User: ${userId}`,
        );
        return {
          status: 'fail',
          message: 'ไม่พบคำเชิญที่คุณต้องการยอมรับ',
          inviteId: null,
        };
      }

      this.logger.log(
        `[DEBUG] Finding guild data - GuildId: ${guildInviteDataDB.guildId}, User: ${userId}`,
      );
      const guildData = await this.prisma.guildDB.findFirst({
        where: { id: guildInviteDataDB.guildId },
      });

      if (!guildData) {
        this.logger.log(
          `[DEBUG] Guild data not found - GuildId: ${guildInviteDataDB.guildId}, User: ${userId}`,
        );
        return {
          status: 'fail',
          message: 'ไม่พบกิลด์ที่คุณจะเข้าร่วมในระบบ',
          inviteId: null,
        };
      }

      this.logger.log(
        `[DEBUG] Checking guild member count - GuildId: ${guildInviteDataDB.guildId}, User: ${userId}`,
      );
      const memberList = await this.prisma.guildMembers.findMany({
        where: { guildId: guildInviteDataDB.guildId },
      });

      const memberSize = memberList.length || 0;
      this.logger.log(
        `[DEBUG] Guild member count - Current: ${memberSize}, Max: ${guildData.guild_size}, User: ${userId}`,
      );

      if (memberSize >= guildData.guild_size) {
        this.logger.log(
          `[DEBUG] Guild is full - MemberSize: ${memberSize}, MaxSize: ${guildData.guild_size}, User: ${userId}`,
        );
        return {
          status: 'fail',
          message: 'คุณไม่สามารถเข้าร่วมกิลด์ได้เนื่องจาก สมาชิกในกิลด์นี้ถึงขีดจำกัดแล้ว',
          inviteId: null,
        };
      }

      this.logger.log(
        `[DEBUG] Creating new guild member - GuildId: ${guildInviteDataDB.guildId}, User: ${userId}`,
      );
      await this.prisma.guildMembers.create({
        data: {
          guildId: guildInviteDataDB.guildId,
          position: 'Member',
          userId: userId,
        },
      });

      this.logger.log(
        `[DEBUG] Guild member created successfully - GuildId: ${guildInviteDataDB.guildId}, User: ${userId}`,
      );

      // Get invite data to add role
      const inviteData = this.inviteData.get(inviteId);
      if (inviteData?.guild) {
        this.logger.log(
          `[DEBUG] Adding role to user - User: ${userId}, RoleId: ${guildData.guild_roleId}`,
        );
        const member = await inviteData.guild.members.fetch(userId);
        await member.roles.add(guildData.guild_roleId);
        this.logger.log(
          `[DEBUG] Role added successfully - User: ${userId}, RoleId: ${guildData.guild_roleId}`,
        );
      }

      this.logger.log(
        `[DEBUG] Deleting guild invite data from DB - InviteId: ${guildInviteDataDB.id}, User: ${userId}`,
      );
      await this.prisma.guildInviteDataDB.delete({
        where: { id: guildInviteDataDB.id },
      });

      return {
        status: 'success',
        message: `ระบบได้เพิ่มคุณเข้าสู่กิลด์ ${guildData.guild_name} เรียบร้อยแล้วค่ะ`,
        inviteId: inviteId,
      };
    } catch (error) {
      this.logger.error(
        `[DEBUG] Error in acceptInvite - InviteId: ${inviteId}, User: ${userId}, Error: ${error.message}, Stack: ${error.stack}`,
      );
      return {
        status: 'fail',
        message: 'เกิดข้อผิดพลาดในการดำเนินการ',
        inviteId: null,
      };
    } finally {
      const endTime = Date.now();
      this.logger.log(
        `[DEBUG] acceptInvite completed - InviteId: ${inviteId}, User: ${userId}, Duration: ${endTime - startTime}ms`,
      );
    }
  }

  async cancelInvite(inviteId: string, userId: string): Promise<void> {
    this.logger.log(`[DEBUG] Cancelling invite - InviteId: ${inviteId}, User: ${userId}`);
    this.inviteData.delete(inviteId);
  }

  storeInviteData(inviteId: string, data: InviteData): void {
    this.logger.log(`[DEBUG] Storing invite data - InviteId: ${inviteId}, UserId: ${data.userId}`);
    this.inviteData.set(inviteId, data);
  }

  getInviteData(inviteId: string): InviteData | undefined {
    return this.inviteData.get(inviteId);
  }

  removeInviteData(inviteId: string): void {
    this.logger.log(`[DEBUG] Removing invite data - InviteId: ${inviteId}`);
    this.inviteData.delete(inviteId);
  }

  getAllInviteData(): Map<string, InviteData> {
    return this.inviteData;
  }
}
