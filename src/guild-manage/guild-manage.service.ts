import { Injectable, Logger } from '@nestjs/common';
import { GuildDB, GuildMembers, PrismaClient, UserDB, MeGuildCoinDB } from '@prisma/client';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  CategoryChannel,
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Guild,
  GuildMember,
  OverwriteResolvable,
  Role,
  StageChannel,
  TextChannel,
  User,
  UserManager,
  VoiceChannel,
} from 'discord.js';
import { ServerRepository } from 'src/repository/server';
import { Button, ButtonContext, Context } from 'necord';

@Injectable()
export class GuildManageService {
  private readonly logger = new Logger(GuildManageService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly users: UserManager,
    private readonly client: Client,
    private readonly serverRepository: ServerRepository,
  ) { }

  private createDismissButton(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId('dismiss_notification')
        .setLabel('ปิดการแจ้งเตือนนี้')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Secondary),
    );
  }

  private createProgressBar(current: number, total: number): string {
    const filled = Math.round((current / total) * 10);
    const empty = 10 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
  }

  async sendProgressUpdateToCreator(
    creatorId: string,
    guildName: string,
    confirmedMembers: string[],
    status: 'progress' | 'completed' | 'failed',
    invitedMembers?: string[],
    reason?: string,
  ): Promise<void> {
    try {
      const creator = await this.users.fetch(creatorId);
      if (!creator) return;

      let embed: EmbedBuilder;
      let autoDeleteTime = 5000; // default 5 seconds

      switch (status) {
        case 'completed':
          embed = new EmbedBuilder()
            .setTitle('🎊 กิลด์ก่อตั้งสำเร็จ!')
            .setDescription(
              `🏰 **กิลด์ "${guildName}" ได้รับการก่อตั้งอย่างเป็นทางการแล้ว!**\n\n` +
              `🎯 **สมาชิกผู้ก่อตั้ง:**\n${confirmedMembers.map((id) => `👑 <@${id}>`).join('\n')}\n\n` +
              `✨ **สถานะ:** เสร็จสมบูรณ์\n` +
              `🎮 **ห้องกิลด์:** ได้ถูกสร้างขึ้นแล้ว`,
            )
            .setColor(0x00ff7f)
            .setFooter({ text: '🌟 ขอแสดงความยินดี! เริ่มต้นการผจญภัยได้เลย' })
            .setTimestamp();
          autoDeleteTime = 20000; // 15 seconds for success
          break;

        case 'progress':
          const totalInvited = invitedMembers?.length || 4;
          const progressBar = this.createProgressBar(confirmedMembers.length, totalInvited);
          const progressPercentage = Math.round((confirmedMembers.length / totalInvited) * 100);

          embed = new EmbedBuilder()
            .setTitle('📈 อัปเดตความคืบหน้ากิลด์')
            .setDescription(
              `🏰 **กิลด์ "${guildName}"**\n\n` +
              `${progressBar} **${confirmedMembers.length}/${totalInvited}** (${progressPercentage}%)\n\n` +
              `✅ **ยืนยันแล้ว:**\n${confirmedMembers.map((id) => `🟢 <@${id}>`).join('\n')}\n\n` +
              `⏳ **รอการยืนยัน:**\n${invitedMembers
                ?.filter((id) => !confirmedMembers.includes(id))
                .map((id) => `🟡 <@${id}>`)
                .join('\n') || 'ไม่มี'
              }\n\n` +
              `💡 **สถานะ:** ${totalInvited - confirmedMembers.length} คนเหลือ`,
            )
            .setColor(0xffa500)
            .setFooter({ text: '⏰ รอสมาชิกคนอื่นยืนยันการเข้าร่วม' })
            .setTimestamp();
          autoDeleteTime = 10000; // 10 seconds for progress
          break;

        case 'failed':
          embed = new EmbedBuilder()
            .setTitle('❌ การก่อตั้งกิลด์ล้มเหลว')
            .setDescription(
              `🏰 **กิลด์ "${guildName}"**\n\n` +
              `💔 **สถานะ:** ยกเลิกแล้ว\n` +
              `📝 **เหตุผล:** ${reason || 'มีสมาชิกปฏิเสธการเชิญ'}\n\n` +
              `🔄 **คำแนะนำ:** คุณสามารถลองสร้างกิลด์ใหม่ได้อีกครั้ง\n` +
              `💡 **เคล็ดลับ:** ลองเชิญสมาชิกคนอื่นที่อาจสนใจเข้าร่วมมากกว่า`,
            )
            .setColor(0xff4444)
            .setFooter({ text: '💪 อย่าท้อแท้! ลองอีกครั้งได้เสมอ' })
            .setTimestamp();
          autoDeleteTime = 8000; // 8 seconds for failure
          break;
      }

      const message = await creator.send({
        embeds: [embed],
        components: [this.createDismissButton()],
      });

      // Auto delete notification
      setTimeout(async () => {
        try {
          await message.delete();
        } catch (error) {
          // Message might already be deleted
        }
      }, autoDeleteTime);
    } catch (error) {
      this.logger.error(`Failed to send progress update to creator ${creatorId}:`, error);
    }
  }

  async onModuleInit() {
    this.logger.log('GuildManageService initialized');
  }

  async getGuild(user: User) {
    this.logger.debug(`[getGuild] Starting to get guild for user: ${user.id} (${user.username})`);

    const guildMembers = await this.prisma.guildMembers.findFirst({
      where: { userId: user.id },
    });

    this.logger.debug(`[getGuild] Found guildMembers:`, guildMembers);

    if (!guildMembers) {
      this.logger.debug(`[getGuild] No guild members found for user: ${user.id}`);
      return null;
    }

    const guild = await this.prisma.guildDB.findFirst({
      where: { id: guildMembers.guildId },
    });

    this.logger.debug(`[getGuild] Found guild:`, guild);

    this.logger.debug(`[getGuild] Final guild result:`, guild);
    return guild || null;
  }

  async checkGuild(userData: UserProfile) {
    this.logger.debug(
      `[checkGuild] Checking guild for user: ${userData.discord_id} (${userData.username})`,
    );
    try {
      const result = await this.prisma.guildMembers.findFirst({
        where: { userId: userData.discord_id },
        include: {
          guildDB: true, // รวมข้อมูลกิลด์ด้วย
        },
      });
      console.log(70, 'result', result);
      this.logger.debug(71, ` [checkGuild] Query result for user ${userData.discord_id}:`, {
        found: !!result,
        guildId: result?.guildId,
        position: result?.position,
        guildName: result?.guildDB?.guild_name,
      });

      if (result) {
        this.logger.log(
          `✅ User ${userData.discord_id} already has guild: ${result.guildDB?.guild_name} (${result.guildId})`,
        );
      } else {
        this.logger.log(`❌ User ${userData.discord_id} has no guild - can create new one`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `[checkGuild] Error checking guild for user ${userData.discord_id}:`,
        error,
      );
      throw error;
    }
  }

  async cancelInviteCreate(interaction: ButtonInteraction, GuildCreateReportId: string) {
    this.logger.debug(
      `[cancelInviteCreate] Starting cancel for GuildCreateReportId: ${GuildCreateReportId} by user: ${interaction.user.id}`,
    );
    try {
      const report = await this.prisma.guildCreateReport.findFirst({
        where: { id: GuildCreateReportId },
      });

      this.logger.debug(`[cancelInviteCreate] Found report:`, report);

      if (!report) {
        this.logger.warn(`[cancelInviteCreate] Report not found: ${GuildCreateReportId}`);
        return interaction.reply({
          content: 'ไม่พบรายงานที่คุณต้องการยกเลิก',
          ephemeral: true,
        });
      }

      this.logger.debug(`[cancelInviteCreate] Deleting message and replying to user`);
      interaction.message.delete().catch(() => { });
      const cancelEmbed = new EmbedBuilder()
        .setTitle('❌ ปฏิเสธการเชิญเข้าร่วมกิลด์')
        .setDescription(
          `🎯 **คุณได้ปฏิเสธการเชิญเข้าร่วมก่อตั้งกิลด์แล้ว**\n\n` +
          `💭 **เหตุผล:** การตัดสินใจของคุณได้ถูกบันทึกแล้ว\n` +
          `📨 **การแจ้งเตือน:** ผู้สร้างกิลด์จะได้รับแจ้งเตือนเกี่ยวกับการตัดสินใจของคุณ\n\n` +
          `💫 **ขอบคุณ:** ขอบคุณที่สละเวลาในการพิจารณา`,
        )
        .setColor(0xff6b6b)
        .setFooter({ text: '💨 ข้อความนี้จะหายไปในอีกไม่กี่วินาที' })
        .setTimestamp();

      const cancelReply = await interaction.reply({
        embeds: [cancelEmbed],
        components: [this.createDismissButton()],
        ephemeral: true,
      });

      // Auto delete after 3 seconds (general process notification)
      setTimeout(async () => {
        try {
          await interaction.deleteReply();
        } catch (error) {
          // Message might already be deleted
        }
      }, 3000);

      if ('ownerId' in report && 'guildName' in report) {
        this.logger.debug(
          `[cancelInviteCreate] Notifying owner: ${report.ownerId} about cancellation`,
        );

        // แจ้งเตือนผู้ส่งคำเชิญว่ากิลด์ล้มเหลว
        await this.sendProgressUpdateToCreator(
          report.ownerId,
          report.guildName,
          [],
          'failed',
          report.invitedMembers,
          `<@${interaction.user.id}> ได้ปฏิเสธการเชิญ`,
        );

        this.logger.debug(`[cancelInviteCreate] Deleting report from database`);
        await this.prisma.guildCreateReport
          .delete({
            where: { id: GuildCreateReportId },
          })
          .catch(() => { });
      }
    } catch (error) {
      this.logger.error(`[cancelInviteCreate] Error during cancellation:`, error);
      interaction.message.delete().catch(() => { });
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ ปฏิเสธการเชิญเข้าร่วมกิลด์')
        .setDescription(
          `🎯 **คุณได้ปฏิเสธการเชิญเข้าร่วมก่อตั้งกิลด์แล้ว**\n\n` +
          `💭 **เหตุผล:** การตัดสินใจของคุณได้ถูกบันทึกแล้ว\n` +
          `📨 **การแจ้งเตือน:** ผู้สร้างกิลด์จะได้รับแจ้งเตือนเกี่ยวกับการตัดสินใจของคุณ\n\n` +
          `💫 **ขอบคุณ:** ขอบคุณที่สละเวลาในการพิจารณา`,
        )
        .setColor(0xff6b6b)
        .setFooter({ text: '💨 ข้อความนี้จะหายไปในอีกไม่กี่วินาที' })
        .setTimestamp();

      const errorReply = await interaction.reply({
        embeds: [errorEmbed],
        components: [this.createDismissButton()],
        ephemeral: true,
      });

      // Auto delete after 3 seconds (general process notification)
      setTimeout(async () => {
        try {
          await interaction.deleteReply();
        } catch (error) {
          // Message might already be deleted
        }
      }, 3000);
    }
  }

  async acceptInviteCreate(interaction: ButtonInteraction, GuildCreateReportId: string) {
    this.logger.debug(
      `128 [acceptInviteCreate] Starting accept for GuildCreateReportId: ${GuildCreateReportId} by user: ${interaction.user.id} `,
    );
    try {
      await interaction.deferReply({ ephemeral: true });
      console.log(131);

      const report = await this.prisma.guildCreateReport.findFirst({
        where: { id: GuildCreateReportId },
      });
      console.log(136);

      this.logger.debug(`[acceptInviteCreate] Found report:`, report);
      console.log(139);

      if (!report) {
        this.logger.warn(`[acceptInviteCreate] Report not found: ${GuildCreateReportId}`);
        return interaction.editReply({
          content: 'ไม่พบรายงานที่คุณต้องการยอมรับ',
        });
      }
      console.log(147);

      if (report.confirmedMembers.length >= 1) {
        this.logger.debug(
          `[acceptInviteCreate] Creating guild with ${report.confirmedMembers.length} confirmed members`,
        );
        const membersList = [...report.confirmedMembers, interaction.user.id];
        this.logger.debug(`[acceptInviteCreate] Members list:`, membersList);
        console.log(153);
        // สร้าง Discord guild ก่อนเพื่อได้ category ID
        this.logger.debug(
          155,
          `[acceptInviteCreate] Creating Discord guild first to get category ID for: ${report.guildName}`,
        );
        const res = await this.createGuild(report.guildName, report.serverId);
        this.logger.debug(157, `[acceptInviteCreate] Create guild result:`, res);
        console.log(158);

        if (!res.role || res.message !== 'success') {
          this.logger.error(`[acceptInviteCreate] Failed to create Discord guild: ${res.message}`);

          // แจ้งเตือนผู้ส่งคำเชิญว่ากิลด์ล้มเหลว
          await this.sendProgressUpdateToCreator(
            report.ownerId,
            report.guildName,
            [],
            'failed',
            report.invitedMembers,
            `ไม่สามารถสร้างห้องกิลด์ได้: ${res.message}`,
          );

          return interaction.editReply({
            content: `กิลด์ ${report.guildName} ของคุณได้รับอนุมัติแล้ว แต่ ${res.message}`,
          });
        }

        // เก็บ category ID สำหรับการอ้างอิง
        const categoryId = res.categoryId;
        this.logger.debug(`[acceptInviteCreate] Category ID: ${categoryId}`);

        const guild = await this.prisma.guildDB.create({
          data: {
            guild_name: report.guildName,
            guild_roleId: res.role.id,
            guild_size: 10,
            guild_level: 1,
            guild_leader: report.ownerId,
            Logo: '',
            guild_categoryId: categoryId, // เก็บ Discord category ID
          },
        });
        console.log(180);
        this.logger.debug(181, ` [acceptInviteCreate] Created guild:`, guild);

        if (!guild) {
          this.logger.error(
            `[acceptInviteCreate] Failed to create guild for report: ${GuildCreateReportId}`,
          );

          // แจ้งเตือนผู้ส่งคำเชิญว่ากิลด์ล้มเหลว
          await this.sendProgressUpdateToCreator(
            report.ownerId,
            report.guildName,
            [],
            'failed',
            report.invitedMembers,
            'ไม่สามารถบันทึกข้อมูลกิลด์ลงฐานข้อมูลได้',
          );

          return interaction.editReply({
            content: 'ไม่สามารถสร้างกิลด์ใหม่ได้ โปรดทำการก่อตั้งกิลด์ใหม่',
          });
        }
        console.log(190);
        this.logger.debug(
          191,
          `[acceptInviteCreate] Creating guild members for guild: ${guild.id}`,
        );
        const members = await this.prisma.guildMembers.createMany({
          data: membersList.map((userId) => ({
            userId,
            position: userId === report.ownerId ? 'Leader' : 'Co-founder',
            guildId: guild.id,
          })),
        });
        console.log(195);
        this.logger.debug(196, `[acceptInviteCreate] Created ${members.count} guild members`);

        if (!members.count) {
          this.logger.error(
            `[acceptInviteCreate] Failed to create guild members for guild: ${guild.id}`,
          );

          // แจ้งเตือนผู้ส่งคำเชิญว่ากิลด์ล้มเหลว
          await this.sendProgressUpdateToCreator(
            report.ownerId,
            report.guildName,
            [],
            'failed',
            report.invitedMembers,
            'ไม่สามารถเพิ่มสมาชิกลงในกิลด์ได้',
          );

          await this.deleteData(guild);
          return interaction.editReply({
            content: 'ไม่สามารถเพิ่มสมาชิกลงในกิลด์ได้',
          });
        }
        console.log(210);
        this.logger.debug(213, `[acceptInviteCreate] Replying success to user`);
        const successEmbed = new EmbedBuilder()
          .setTitle('🎊 ยินดีด้วย! กิลด์ก่อตั้งสำเร็จ!')
          .setDescription(
            `🏰 **กิลด์ "${report.guildName}" ได้รับการก่อตั้งอย่างเป็นทางการแล้ว!**\n\n` +
            `🎯 **สถานะของคุณ:** ผู้ร่วมก่อตั้งกิลด์\n` +
            `💎 **สิทธิพิเศษ:** คุณได้รับสิทธิ์เข้าถึงพื้นที่ส่วนตัวของกิลด์แล้ว\n` +
            `🎮 **ห้องกิลด์:** ห้องพูดคุยและกิจกรรมของกิลด์ได้ถูกสร้างขึ้นแล้ว\n` +
            `👑 **บทบาท:** คุณได้รับบทบาทผู้ร่วมก่อตั้งพร้อมสิทธิพิเศษทั้งหมด!\n\n` +
            `✨ **ขั้นตอนต่อไป:** เริ่มต้นการผจญภัยกับสมาชิกกิลด์ได้เลย!`,
          )
          .setColor(0x00ff7f)
          .setFooter({ text: '🌟 ขอบคุณที่เป็นส่วนหนึ่งของการก่อตั้งกิลด์!' })
          .setTimestamp()
          .setThumbnail(
            'https://media.discordapp.net/attachments/861491684214833182/1224408324922015876/DALLE_2024-04-02_00.21.20_-_A_vibrant_watercolor_of_an_elven_archer_a_human_mage_and_a_dwarf_warrior_standing_triumphantly_atop_a_hill_looking_towards_the_horizon_at_dawn._The.webp?ex=661d621d&is=660aed1d&hm=29e373d7dea2b16ceddf3e45271ca343bf01c5e5b2bbfc1ee263503f04900ca7&=&format=webp&width=839&height=479',
          );

        await interaction.editReply({
          embeds: [successEmbed],
          components: [this.createDismissButton()],
        });

        // Auto delete after 10 seconds (success notification with extensive content)
        setTimeout(async () => {
          try {
            await interaction.deleteReply();
          } catch (error) {
            // Message might already be deleted
          }
        }, 20000);
        console.log(214);
        this.logger.debug(217, `[acceptInviteCreate] Fetching Discord guild: ${report.serverId}`);
        const Interguild = await this.client.guilds.fetch(report.serverId);
        if (!Interguild) {
          this.logger.error(
            `[acceptInviteCreate] Failed to fetch Discord guild: ${report.serverId}`,
          );
          return interaction.editReply({
            content: 'ไม่สามารถเข้าถึงดิสกิลด์ได้',
          });
        }
        console.log(225);
        this.logger.debug(228, `[acceptInviteCreate] Fetching server data for role IDs`);

        // ดึงข้อมูล server เพื่อใช้ guildHeadRoleId และ guildCoRoleId
        const serverData = await this.serverRepository.getServerById(report.serverId);
        if (!serverData) {
          this.logger.error(`[acceptInviteCreate] Server data not found for: ${report.serverId}`);
          return interaction.editReply({
            content: 'ไม่พบข้อมูลเซิร์ฟเวอร์ กรุณาสร้าง Guild Room ก่อน',
          });
        }

        this.logger.debug(230, `[acceptInviteCreate] Fetching owner: ${report.ownerId}`);
        const owner = await Interguild.members.fetch(report.ownerId);
        console.log(230);
        this.logger.debug(231, `[acceptInviteCreate] Adding roles to owner: ${report.ownerId}`);

        // ใช้ guildHeadRoleId แทน environment variable
        if (serverData.guildHeadRoleId) {
          owner?.roles.add(serverData.guildHeadRoleId).catch((error) => {
            this.logger.error('Failed to add guild head role to owner', error);
          });
        } else {
          this.logger.warn('guildHeadRoleId not found in server data');
        }
        owner?.roles.add(res.role).catch((error) => {
          this.logger.error('Failed to add guild role to owner', error);
        });
        console.log(235);
        const coFounders = membersList.filter((id) => id !== report.ownerId);
        this.logger.debug(
          238,
          `[acceptInviteCreate] Processing ${coFounders.length} co-founders:`,
          coFounders,
        );
        console.log(238);
        for (const id of coFounders) {
          this.logger.debug(241, `[acceptInviteCreate] Processing co-founder: ${id}`);
          const member = await Interguild.members.fetch(id);
          if (member) {
            // ใช้ guildCoRoleId แทน environment variable
            if (serverData.guildCoRoleId) {
              member.roles.add(serverData.guildCoRoleId).catch((error) => {
                this.logger.error(`Failed to add guild co-role to member ${id}`, error);
              });
            } else {
              this.logger.warn('guildCoRoleId not found in server data');
            }
            member.roles.add(res.role).catch((error) => {
              this.logger.error(`Failed to add guild role to member ${id}`, error);
            });
          } else {
            this.logger.warn(`[acceptInviteCreate] Could not fetch member: ${id}`);
          }
        }
        console.log(283);
        this.logger.debug(263, ` [acceptInviteCreate] Updating message and cleaning up`);
        this.updateMessage(report.channelId, report.messageId, report.guildName, membersList);

        // แจ้งเตือนผู้ส่งคำเชิญว่ากิลด์ก่อตั้งสำเร็จ
        await this.sendProgressUpdateToCreator(
          report.ownerId,
          report.guildName,
          membersList,
          'completed',
        );

        console.log(286);
        await this.prisma.guildCreateReport
          .delete({ where: { id: GuildCreateReportId } })
          .catch(() => { });
        console.log(287);
        interaction.message.delete().catch(() => {
          this.logger.error('Failed to delete interaction message');
        });
      } else {
        this.logger.debug(
          274,
          ` [acceptInviteCreate] Adding user to confirmed members (not enough members yet)`,
        );
        await this.prisma.guildCreateReport.update({
          data: { confirmedMembers: { push: interaction.user.id } },
          where: { id: GuildCreateReportId },
        });
        console.log(298);
        this.logger.debug(299, ` [acceptInviteCreate] Replying success and updating message`);
        const remainingCount = report.invitedMembers.length - (report.confirmedMembers.length + 1);
        const confirmEmbed = new EmbedBuilder()
          .setTitle('✅ ยืนยันการเข้าร่วมสำเร็จ!')
          .setDescription(
            `🎯 **คุณได้ยืนยันการเข้าร่วมก่อตั้งกิลด์ "${report.guildName}" แล้ว**\n\n` +
            `📊 **สถานะปัจจุบัน:**\n` +
            `✅ ยืนยันแล้ว: **${report.confirmedMembers.length + 1}** คน\n` +
            `⏳ รอการยืนยัน: **${remainingCount}** คน\n\n` +
            `🎮 **ขั้นตอนต่อไป:** รอสมาชิกคนอื่นยืนยันการเข้าร่วม\n` +
            `🏰 **เมื่อครบจำนวน:** กิลด์จะถูกสร้างทันที!\n\n` +
            `💡 **หมายเหตุ:** คุณจะได้รับแจ้งเตือนเมื่อกิลด์ก่อตั้งเสร็จสิ้น`,
          )
          .setColor(0x4caf50)
          .setFooter({ text: '⏰ กำลังรอสมาชิกคนอื่นตัดสินใจ...' })
          .setTimestamp();

        await interaction.editReply({
          embeds: [confirmEmbed],
          components: [this.createDismissButton()],
        });

        // Auto delete after 7 seconds (progress notification with moderate content)
        setTimeout(async () => {
          try {
            await interaction.deleteReply();
          } catch (error) {
            // Message might already be deleted
          }
        }, 7000);
        interaction.message.delete().catch(() => {
          this.logger.error('Failed to delete interaction message');
        });
        console.log(306);
        this.updateMessage(report.channelId, report.messageId, report.guildName, [
          ...report.confirmedMembers,
          interaction.user.id,
        ]);

        // แจ้งเตือนผู้ส่งคำเชิญว่ามีความคืบหน้า
        const updatedMembers = [...report.confirmedMembers, interaction.user.id];
        await this.sendProgressUpdateToCreator(
          report.ownerId,
          report.guildName,
          updatedMembers,
          'progress',
          report.invitedMembers,
        );

        console.log(311);
      }
    } catch (error) {
      this.logger.error('Error in acceptInviteCreate', error);

      // พยายามแจ้งเตือนผู้ส่งคำเชิญถ้าเป็นไปได้
      try {
        const report = await this.prisma.guildCreateReport.findFirst({
          where: { id: GuildCreateReportId },
        });

        if (report) {
          await this.sendProgressUpdateToCreator(
            report.ownerId,
            report.guildName,
            [],
            'failed',
            report.invitedMembers,
            'เกิดข้อผิดพลาดในระบบระหว่างการสร้างกิลด์',
          );
        }
      } catch (notifyError) {
        this.logger.error('Error notifying creator of failure', notifyError);
      }

      interaction.editReply({
        content: 'เกิดข้อผิดพลาดในการยืนยันคำขอ โปรดลองอีกครั้ง',
      });
    }
  }

  async deleteData(guildDB: GuildDB) {
    this.logger.debug(
      `[deleteData] Starting cleanup for guild: ${guildDB.id} (${guildDB.guild_name})`,
    );
    await this.prisma.guildDB.delete({ where: { id: guildDB.id } }).catch(() => {
      this.logger.error(`Failed to delete guild: ${guildDB.id}`);
    });
    await this.prisma.guildMembers.deleteMany({ where: { guildId: guildDB.id } }).catch(() => {
      this.logger.error(`Failed to delete guild members for guild: ${guildDB.id}`);
    });
    this.logger.debug(`[deleteData] Cleanup completed for guild: ${guildDB.id}`);
  }

  async updateMessage(channelId: string, messageId: string, guildName: string, members: string[]) {
    this.logger.debug(
      `[updateMessage] Updating message for guild: ${guildName} with ${members.length} members`,
    );
    try {
      // ตรวจสอบว่า channelId และ messageId มีค่าหรือไม่
      if (!channelId || !messageId) {
        this.logger.warn(
          `[updateMessage] Missing channelId or messageId: channelId=${channelId}, messageId=${messageId}`,
        );
        return;
      }

      const channel = (await this.client.channels.fetch(channelId).catch((error) => {
        this.logger.warn(`[updateMessage] Failed to fetch channel ${channelId}:`, error.message);
        return null;
      })) as TextChannel | VoiceChannel;

      if (!channel) {
        this.logger.warn(`[updateMessage] Channel not found: ${channelId}`);
        return;
      }

      // ตรวจสอบว่า channel เป็น text channel หรือไม่
      if (!channel.isTextBased()) {
        this.logger.warn(`[updateMessage] Channel is not text-based: ${channelId}`);
        return;
      }

      const message = await channel.messages.fetch(messageId).catch((error) => {
        if (error.code === 10008) {
          this.logger.warn(
            `[updateMessage] Message ${messageId} not found - it may have been deleted or expired`,
          );
        } else {
          this.logger.warn(`[updateMessage] Failed to fetch message ${messageId}:`, error.message);
        }
        return null;
      });

      if (!message) {
        this.logger.warn(`[updateMessage] Message not found: ${messageId}`);
        return;
      }

      // ตรวจสอบว่า message มี embed หรือไม่
      if (!message.embeds || message.embeds.length === 0) {
        this.logger.warn(`[updateMessage] Message has no embeds: ${messageId}`);
        return;
      }

      // ตรวจสอบว่า bot เป็นผู้เขียน message หรือไม่
      if (message.author.id !== this.client.user?.id) {
        this.logger.warn(`[updateMessage] Cannot edit message ${messageId} - not authored by bot`);
        return;
      }

      // Get the original guild report to determine total invited
      const report = await this.prisma.guildCreateReport.findFirst({
        where: { messageId: messageId },
      });

      const totalInvited = report ? report.invitedMembers.length : 4;
      const confirmedCount = members.length;

      const embed = new EmbedBuilder(message.embeds[0].toJSON());
      if (confirmedCount >= totalInvited) {
        this.logger.debug(
          `[updateMessage] Guild ${guildName} is complete with ${confirmedCount} members`,
        );
        embed
          .setDescription(`# 🎉 กิลด์ ${guildName} ได้รับการก่อตั้งอย่างเป็นทางการแล้ว`)
          .setColor('Gold');
      } else {
        this.logger.debug(
          `[updateMessage] Guild ${guildName} progress: ${confirmedCount}/${totalInvited}`,
        );

        const progressBar = this.createProgressBar(confirmedCount, totalInvited);
        const progressPercentage = Math.round((confirmedCount / totalInvited) * 100);

        let invitedList = '';
        if (report && report.invitedMembers.length > 0) {
          invitedList = '\n\n🎯 **คำเชิญชวนร่วมก่อตั้งได้ส่งไปยัง:**\n';
          report.invitedMembers.forEach((userId, index) => {
            const status = index < confirmedCount ? '✅' : '⏳';
            invitedList += `${status} ${index + 1}. <@${userId}>\n`;
          });
          invitedList += '\n⏰ **ข้อความนี้จะปิดตัวเองใน 3 นาที**';
        }

        embed
          .setTitle(`🏰 คำร้องขอก่อตั้งกิลด์ "${guildName}"`)
          .setDescription(
            // `${progressBar} **${confirmedCount}/${totalInvited}** (${progressPercentage}%)\n\n` +
            `📊 **สถานะปัจจุบัน:**\n` +
            `✅ ยืนยันแล้ว: **${confirmedCount}** คน\n` +
            `⏳ รอการยืนยัน: **${totalInvited - confirmedCount}** คน${invitedList}`,
          )
          .setColor(confirmedCount === totalInvited ? 0x00ff00 : 0xffa500)
          .setFooter({
            text: `🎮 กิลด์ ${guildName} • กำลังรอการยืนยันจากสมาชิก`,
            iconURL: 'https://cdn.discordapp.com/emojis/1234567890123456789.png',
          })
          .setTimestamp();
      }
      // ปิดตัวเองใน 15 วินาที
      await message.edit({ embeds: [embed] }).catch((error) => {
        if (error.code === 10008) {
          this.logger.warn(
            `[updateMessage] Message ${messageId} not found - it may have been deleted`,
          );
        } else {
          this.logger.error(`[updateMessage] Failed to edit message ${messageId}:`, error.message);
        }
      });
      setTimeout(async () => {
        await message.delete().catch((error) => {
          this.logger.warn(`[updateMessage] Failed to delete message ${messageId}:`, error.message);
        });
      }, 15000);
    } catch (error) {
      this.logger.error(`[updateMessage] Failed to update message for guild ${guildName}:`, error);
    }
  }

  async createGuild(
    guildName: string,
    guildId: string,
  ): Promise<{ role: Role | undefined; message: string; categoryId?: string }> {
    this.logger.debug(`[createGuild] Starting guild creation for: ${guildName}`);

    const guildServer = await this.client.guilds.fetch(guildId).catch((error) => {
      this.logger.error('Failed to fetch guild:', error);
      return undefined;
    });

    if (!guildServer) {
      this.logger.error(`[createGuild] Failed to fetch Discord guild: ${guildId}`);
      return { role: undefined, message: 'ไม่สามารถเข้าถึงดิสกิลด์ได้', categoryId: undefined };
    }

    this.logger.debug(`[createGuild] Successfully fetched Discord guild: ${guildServer.name}`);

    this.logger.log('guildServer', guildServer);
    try {
      console.log(386, ' guildServer', guildServer);
      console.log(387, ' guildName', guildName);

      this.logger.debug(388, `[createGuild] Creating role for guild: ${guildName}`);
      const role = await guildServer.roles.create({
        name: `🏤 ${guildName}`,
        position: 1,
        color: '#A4F1FF',
      });

      this.logger.debug(
        395,
        ` [createGuild] Created role: ${role.name} (${role.id}) ${guildServer.id}`,
      );
      this.logger.debug(396, `[createGuild] Creating channels for guild: ${role.name}`);

      const channelResult = await this.createChannel(role, guildServer.id);
      this.logger.log(399, 'role', role);
      this.logger.log(400, 'channelResult', channelResult);

      this.logger.debug(405, `[createGuild] Guild creation completed for: ${guildName}`);
      return { role, message: channelResult.message, categoryId: channelResult.categoryId };
    } catch (error) {
      this.logger.error('Error creating guild room', error);
      return { role: undefined, message: 'ไม่สามารถสร้างห้องกิลด์ได้', categoryId: undefined };
    }
  }
  private async createPrivateVoiceChannel(
    category: CategoryChannel,
    name: string,
    state: 0 | 1 | 2 = 0, // 0 = Voice, 1 = Stage, 2 = Text
    server?: any, // ถ้ามี type ของ ServerDB ให้ใส่แทน any
    guildServer?: Guild,
    roles?: Role, // Guild role สำหรับ permission
  ) {
    this.logger.debug(
      `[createVoiceChannel] Creating channel: ${name} (state: ${state}, category: ${category.id}`,
    );
    try {
      const type =
        state === 0
          ? ChannelType.GuildVoice
          : state === 1
            ? ChannelType.GuildStageVoice
            : ChannelType.GuildText;

      const permissionOverwrites = [
        // @everyone - มองไม่เห็น
        {
          id: guildServer.roles.everyone.id,
          deny: ['ViewChannel'],
        },
        // 🎭 ผู้มีเอกลักษณ์ - มองไม่เห็น
        ...(server?.eccentricRoleId
          ? [
            {
              id: server.eccentricRoleId,
              deny: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
            },
          ]
          : []),
        // ⚔️ นักผจญภัย - มองไม่เห็น
        ...(server?.adventurerRoleId
          ? [
            {
              id: server.adventurerRoleId,
              deny: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
            },
          ]
          : []),
        // 👥 ผู้เยี่ยมชม - มองไม่เห็น
        ...(server?.visitorRoleId
          ? [
            {
              id: server.visitorRoleId,
              deny: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
            },
          ]
          : []),
        // 🏤 ชื่อกิลด์ - มองเห็น (เฉพาะสมาชิกกิลด์)
        ...(roles
          ? [
            {
              id: roles.id, // Guild role ID
              allow: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
            },
          ]
          : []),
      ];

      const ch = await category.children.create({
        type,
        name,
        permissionOverwrites: permissionOverwrites as OverwriteResolvable[],
      });

      this.logger.debug(`[createVoiceChannel] Created: ${ch.name} (${ch.id})`);
      return ch;
    } catch (error) {
      this.logger.error(`[createVoiceChannel] Failed to create channel "${name}":`, error);
      throw new Error(`ไม่สามารถสร้างห้อง ${name} ได้`);
    }
  }

  private async createPublicVoiceChannel(
    category: CategoryChannel,
    name: string,
    state: 0 | 1 | 2 = 0, // 0 = Voice, 1 = Stage, 2 = Text
    server?: any, // ถ้ามี type ของ ServerDB ให้ใส่แทน any
    guildServer?: Guild,
    roles?: Role, // Guild role สำหรับ permission
  ) {
    this.logger.debug(
      `[createVoiceChannel] Creating channel: ${name} (state: ${state}, category: ${category.id}`,
    );
    try {
      const type =
        state === 0
          ? ChannelType.GuildVoice
          : state === 1
            ? ChannelType.GuildStageVoice
            : ChannelType.GuildText;

      const permissionOverwrites = [
        // @everyone - มองไม่เห็น
        {
          id: guildServer.roles.everyone.id,
          allow: ['ViewChannel'],
        },
        // 🎭 ผู้มีเอกลักษณ์ - มองไม่เห็น
        ...(server?.eccentricRoleId
          ? [
            {
              id: server.eccentricRoleId,
              deny: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
            },
          ]
          : []),
        // ⚔️ นักผจญภัย - มองไม่เห็น
        ...(server?.adventurerRoleId
          ? [
            {
              id: server.adventurerRoleId,
              allow: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
            },
          ]
          : []),
        // 👥 ผู้เยี่ยมชม - มองไม่เห็น
        ...(server?.visitorRoleId
          ? [
            {
              id: server.visitorRoleId,
              allow: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
            },
          ]
          : []),
        // 🏤 ชื่อกิลด์ - มองเห็น (เฉพาะสมาชิกกิลด์)
        ...(roles
          ? [
            {
              id: roles.id, // Guild role ID
              allow: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
            },
          ]
          : []),
      ];

      const ch = await category.children.create({
        type,
        name,
        permissionOverwrites: permissionOverwrites as OverwriteResolvable[],
      });

      this.logger.debug(`[createVoiceChannel] Created: ${ch.name} (${ch.id})`);
      return ch;
    } catch (error) {
      this.logger.error(`[createVoiceChannel] Failed to create channel "${name}":`, error);
      throw new Error(`ไม่สามารถสร้างห้อง ${name} ได้`);
    }
  }
  private async createGiftHouseChannel(roles: Role, guildId: string): Promise<void> {
    this.logger.debug(
      `[createGiftHouseChannel] Creating gift house channel for category: ${guildId}`,
    );
    try {
      const guildServer = await this.client.guilds.fetch(guildId);
      if (!guildServer) {
        this.logger.error('Failed to fetch guild');
        return;
      }

      // ดึงข้อมูล server เพื่อใช้ role IDs
      const server = await this.serverRepository.getServerById(guildId);
      if (!server) {
        this.logger.error('Failed to fetch server data for gift house channel');
        return;
      }

      console.log(463, 'roles : ', roles.id);
      console.log(464, 'guildId : ', guildId);

      const permissionOverwrites = [
        // @everyone - มองไม่เห็น
        {
          id: guildServer.roles.everyone.id,
          deny: ['ViewChannel'],
        },
        // 🎭 นอกรีต - มองไม่เห็น (ยกเว้น Guild ตัวเอง)
        ...(server.eccentricRoleId
          ? [
            {
              id: server.eccentricRoleId,
              deny: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
            },
          ]
          : []),
        // 🏤 ชื่อกิลด์ - มองเห็น (เจ้าของ Guild)
        {
          id: roles.id,
          allow: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
        },
        // ⚔️ นักผจญภัย - มองเห็น
        ...(server.adventurerRoleId
          ? [
            {
              id: server.adventurerRoleId,
              allow: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
            },
          ]
          : []),
        // 👥 ผู้เยี่ยมชม - มองเห็น
        ...(server.visitorRoleId
          ? [
            {
              id: server.visitorRoleId,
              allow: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
            },
          ]
          : []),
      ];

      const channel = await guildServer.channels.create({
        name: `🎁・เยี่ยมบ้าน`,
        type: ChannelType.GuildVoice,
        parent: guildId,
        permissionOverwrites: permissionOverwrites as OverwriteResolvable[],
      });

      this.logger.debug(
        `[createGiftHouseChannel] Created gift house channel: ${channel.name} (${channel.id})`,
      );
    } catch (error) {
      this.logger.error('Failed to create gift house channel:', error);
    }
  }

  private async createGuildEventChannel(roles: Role, guildId: string): Promise<void> {
    this.logger.debug(
      `[createGuildEventChannel] Creating guild event channel for category: ${guildId}`,
    );
    try {
      const guildServer = await this.client.guilds.fetch(guildId);
      if (!guildServer) {
        this.logger.error('Failed to fetch guild');
        return;
      }

      const channel = await guildServer.channels.create({
        name: `👑・กิจกรรมกิลด์`,
        type: ChannelType.GuildStageVoice,
        parent: guildId,
        permissionOverwrites: [
          {
            id: roles.id,
            allow: ['Connect', 'ViewChannel'],
          },
        ],
      });

      this.logger.debug(
        `[createGuildEventChannel] Created guild event channel: ${channel.name} (${channel.id})`,
      );
    } catch (error) {
      this.logger.error('Failed to create guild event channel:', error);
    }
  }

  private async createChannel(
    roles: Role,
    guildId: string,
  ): Promise<{ message: string; categoryId?: string }> {
    this.logger.debug(
      `[createChannel] Starting channel creation for role: ${roles.name} (${roles.id})`,
    );
    try {
      const guildServer = await this.client.guilds.fetch(guildId);
      if (!guildServer) {
        this.logger.error('Failed to fetch guild');
        return { message: 'ไม่สามารถเข้าถึงดิสกิลด์ได้', categoryId: undefined };
      }

      this.logger.debug(`[createChannel] Fetching server data for: ${guildServer.id}`);
      const server = await this.serverRepository.getServerById(guildServer.id);
      if (!server) {
        this.logger.error('Failed to fetch server');
        return { message: 'ไม่สามารถเข้าถึงดิสกิลด์ได้', categoryId: undefined };
      }

      // ตำแหน่งสร้างกิลด์
      this.logger.debug(
        `[createChannel] Getting position guild from register channel: ${server.registerChannel}`,
      );
      const positionGuild = guildServer.channels.cache.get(
        server.registerChannel,
      ) as CategoryChannel;

      this.logger.debug(`[createChannel] Creating category: ${roles.name}`);
      const category = await guildServer.channels.create({
        name: roles.name,
        type: ChannelType.GuildCategory,
        ...(positionGuild ? { position: positionGuild.position + 1 } : {}),
        permissionOverwrites: [
          {
            id: guildServer.roles.everyone.id,
            allow: ['ViewChannel'],
          },
          {
            id: guildId,
            allow: ['ViewChannel'],
            deny: ['Connect'],
          },
          {
            id: roles.id,
            allow: ['ViewChannel', 'Connect'],
          },
        ],
      });

      if (!category) {
        this.logger.error('Failed to create guild category');
        return { message: 'ไม่สามารถสร้างห้องหมวดหมู่กิลด์ได้', categoryId: undefined };
      }

      this.logger.debug(`[createChannel] Created category: ${category.name} (${category.id})`);

      // เรียกใช้เมธอดใหม่แทนฟังก์ชันซ้อน
      this.logger.debug(`[createChannel] Creating all channels for guild`);
      await Promise.all([
        this.createPrivateVoiceChannel(category, '💬・แชท', 2, server, guildServer, roles),
        this.createPrivateVoiceChannel(category, '🎤・โถงหลัก', 0, server, guildServer, roles),
        this.createPrivateVoiceChannel(category, '🎤・โถงรอง', 0, server, guildServer, roles),
        this.createPublicVoiceChannel(category, '👑・กิจกรรม', 1, server, guildServer, roles),
        this.createPublicVoiceChannel(category, '🎁・เยี่ยมบ้าน', 0, server, guildServer, roles),
        // ถ้าจะเปิดห้อง public ให้เปลี่ยน publicView = true
        // this.createVoiceChannel(category, '📣・ประชาสัมพันธ์', 2, true, server, guildServer, roles),
      ]);

      this.logger.debug(
        `[createChannel] All channels created successfully for role: ${roles.name}`,
      );
      return { message: 'success', categoryId: category.id };
    } catch (error: any) {
      this.logger.error('Error in createChannel:', error);
      return { message: error.message || 'เกิดข้อผิดพลาดในการสร้างห้อง', categoryId: undefined };
    }
  }

  @Button('dismiss_notification')
  async dismissNotification(@Context() [interaction]: ButtonContext): Promise<void> {
    const dismissEmbed = new EmbedBuilder()
      .setTitle('🗑️ การแจ้งเตือนถูกปิดแล้ว')
      .setDescription(
        `✅ **ข้อความได้ถูกซ่อนแล้ว**\n\n` +
        `💡 **คำแนะนำ:** หากต้องการข้อมูลเพิ่มเติม สามารถใช้คำสั่งต่างๆ ของบอทได้\n` +
        `🔄 **หมายเหตุ:** ข้อความนี้จะหายไปอัตโนมัติในอีกไม่กี่วินาที`,
      )
      .setColor(0x95a5a6)
      .setFooter({ text: '💫 ขอบคุณที่ใช้บริการ' })
      .setTimestamp();

    await interaction.update({
      embeds: [dismissEmbed],
      components: [],
    });

    // Auto delete after 3 minutes
    setTimeout(
      async () => {
        try {
          await interaction.deleteReply();
        } catch (error) {
          // Message might already be deleted
        }
      },
      3 * 60 * 1000,
    );
  }
}

export interface UserProfile extends UserDB {
  GuildMembers: GuildMembers[];
  meGuildCoinDB: MeGuildCoinDB | null;
}
