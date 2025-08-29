import { Injectable, Logger } from '@nestjs/common';
import { GuildDB, GuildMembers, PrismaClient, UserDB, MeGuildCoinDB } from '@prisma/client';
import {
  ButtonInteraction,
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

@Injectable()
export class GuildManageService {
  private readonly logger = new Logger(GuildManageService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly users: UserManager,
    private readonly client: Client,
    private readonly serverRepository: ServerRepository,
  ) { }

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
    this.logger.debug(`[checkGuild] Checking guild for user: ${userData.discord_id} (${userData.username})`);
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
        this.logger.log(`✅ User ${userData.discord_id} already has guild: ${result.guildDB?.guild_name} (${result.guildId})`);
      } else {
        this.logger.log(`❌ User ${userData.discord_id} has no guild - can create new one`);
      }

      return result;
    } catch (error) {
      this.logger.error(`[checkGuild] Error checking guild for user ${userData.discord_id}:`, error);
      throw error;
    }
  }

  async cancelInviteCreate(interaction: ButtonInteraction, GuildCreateReportId: string) {
    this.logger.debug(`[cancelInviteCreate] Starting cancel for GuildCreateReportId: ${GuildCreateReportId} by user: ${interaction.user.id}`);
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
      interaction.reply({
        content: 'ยกเลิกคำขอสำเร็จ',
        ephemeral: true,
      });

      if ('ownerId' in report && 'guildName' in report) {
        this.logger.debug(`[cancelInviteCreate] Notifying owner: ${report.ownerId} about cancellation`);
        const user = await this.users.fetch(report.ownerId);
        if (user) {
          user
            .send({
              content: `❌ เนื่องจากผู้ร่วมก่อตั้งกิลด์ ${report.guildName} ไม่เห็นด้วยกับคำขอของคุณ คำขอสร้างกิลด์ของคุณได้ถูกยกเลิกแล้ว`,
            })
            .catch(() => { });
        }

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
      interaction.reply({
        content: 'ยกเลิกคำขอสำเร็จ',
        ephemeral: true,
      });
    }
  }

  async acceptInviteCreate(interaction: ButtonInteraction, GuildCreateReportId: string) {
    this.logger.debug(`128 [acceptInviteCreate] Starting accept for GuildCreateReportId: ${GuildCreateReportId} by user: ${interaction.user.id} `);
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
        this.logger.debug(`[acceptInviteCreate] Creating guild with ${report.confirmedMembers.length} confirmed members`);
        const membersList = [...report.confirmedMembers, interaction.user.id];
        this.logger.debug(`[acceptInviteCreate] Members list:`, membersList);
        console.log(153);
        // สร้าง Discord guild ก่อนเพื่อได้ category ID
        this.logger.debug(155, `[acceptInviteCreate] Creating Discord guild first to get category ID for: ${report.guildName}`);
        const res = await this.createGuild(report.guildName, report.serverId);
        this.logger.debug(157, `[acceptInviteCreate] Create guild result:`, res);
        console.log(158);

        if (!res.role || res.message !== 'success') {
          this.logger.error(`[acceptInviteCreate] Failed to create Discord guild: ${res.message}`);
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
            guild_copper: 0,
            guild_leader: report.ownerId,
            Logo: '',
            guild_categoryId: categoryId, // เก็บ Discord category ID
          },
        });
        console.log(180);
        this.logger.debug(181, ` [acceptInviteCreate] Created guild:`, guild);

        if (!guild) {
          this.logger.error(`[acceptInviteCreate] Failed to create guild for report: ${GuildCreateReportId}`);
          return interaction.editReply({
            content: 'ไม่สามารถสร้างกิลด์ใหม่ได้ โปรดทำการก่อตั้งกิลด์ใหม่',
          });
        }
        console.log(190);
        this.logger.debug(191, `[acceptInviteCreate] Creating guild members for guild: ${guild.id}`);
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
          this.logger.error(`[acceptInviteCreate] Failed to create guild members for guild: ${guild.id}`);
          await this.deleteData(guild);
          return interaction.editReply({
            content: 'ไม่สามารถเพิ่มสมาชิกลงในกิลด์ได้',
          });
        }
        console.log(210);
        this.logger.debug(213, `[acceptInviteCreate] Replying success to user`);
        interaction.editReply({
          content: 'ยืนยันคำขอสำเร็จ',
        });
        console.log(214);
        this.logger.debug(217, `[acceptInviteCreate] Fetching Discord guild: ${report.serverId}`);
        const Interguild = await this.client.guilds.fetch(report.serverId);
        if (!Interguild) {
          this.logger.error(`[acceptInviteCreate] Failed to fetch Discord guild: ${report.serverId}`);
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
        this.logger.debug(238, `[acceptInviteCreate] Processing ${coFounders.length} co-founders:`, coFounders);
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
            member
              .send({
                content: `🎉 ยินดีด้วย! กิลด์ ${report.guildName} ได้รับการก่อตั้งอย่างเป็นทางการแล้ว`,
              })
              .catch(() => {
                this.logger.error(`Failed to send message to member ${id}`);
              });
          } else {
            this.logger.warn(`[acceptInviteCreate] Could not fetch member: ${id}`);
          }
        }
        console.log(283);
        this.logger.debug(263, ` [acceptInviteCreate] Updating message and cleaning up`);
        this.updateMessage(report.channelId, report.messageId, report.guildName, membersList);
        console.log(286);
        await this.prisma.guildCreateReport.delete({ where: { id: GuildCreateReportId } }).catch(() => { });
        console.log(287);
        interaction.message.delete().catch(() => {
          this.logger.error('Failed to delete interaction message');
        });
      } else {
        this.logger.debug(274, ` [acceptInviteCreate] Adding user to confirmed members (not enough members yet)`);
        await this.prisma.guildCreateReport.update({
          data: { confirmedMembers: { push: interaction.user.id } },
          where: { id: GuildCreateReportId },
        });
        console.log(298);
        this.logger.debug(299, ` [acceptInviteCreate] Replying success and updating message`);
        interaction.editReply({
          content: 'ยืนยันคำขอสำเร็จ',
        });
        interaction.message.delete().catch(() => {
          this.logger.error('Failed to delete interaction message');
        });
        console.log(306);
        this.updateMessage(report.channelId, report.messageId, report.guildName, [
          ...report.confirmedMembers,
          interaction.user.id,
        ]);
        console.log(311);
      }
    } catch (error) {
      this.logger.error('Error in acceptInviteCreate', error);
      interaction.editReply({
        content: 'เกิดข้อผิดพลาดในการยืนยันคำขอ โปรดลองอีกครั้ง',
      });
    }
  }

  async deleteData(guildDB: GuildDB) {
    this.logger.debug(`[deleteData] Starting cleanup for guild: ${guildDB.id} (${guildDB.guild_name})`);
    await this.prisma.guildDB.delete({ where: { id: guildDB.id } }).catch(() => {
      this.logger.error(`Failed to delete guild: ${guildDB.id}`);
    });
    await this.prisma.guildMembers.deleteMany({ where: { guildId: guildDB.id } }).catch(() => {
      this.logger.error(`Failed to delete guild members for guild: ${guildDB.id}`);
    });
    this.logger.debug(`[deleteData] Cleanup completed for guild: ${guildDB.id}`);
  }

  async updateMessage(channelId: string, messageId: string, guildName: string, members: string[]) {
    this.logger.debug(`[updateMessage] Updating message for guild: ${guildName} with ${members.length} members`);
    try {
      // ตรวจสอบว่า channelId และ messageId มีค่าหรือไม่
      if (!channelId || !messageId) {
        this.logger.warn(`[updateMessage] Missing channelId or messageId: channelId=${channelId}, messageId=${messageId}`);
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
        this.logger.warn(`[updateMessage] Failed to fetch message ${messageId}:`, error.message);
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

      const embed = new EmbedBuilder(message.embeds[0].toJSON());
      if (members.length >= 4) {
        this.logger.debug(`[updateMessage] Guild ${guildName} is complete with ${members.length} members`);
        embed
          .setTitle(`#🎉 กิลด์ ${guildName} ได้รับการก่อตั้งอย่างเป็นทางการแล้ว`)
          .setColor('Gold');
      } else {
        this.logger.debug(`[updateMessage] Guild ${guildName} progress: ${members.length}/4`);
        embed.setTitle(`# ความคืบหน้า (${members.length}/4) ของกิลด์ ${guildName}`);
      }

      await message.edit({ embeds: [embed] }).catch((error) => {
        this.logger.error(`[updateMessage] Failed to edit message ${messageId}:`, error.message);
      });
    } catch (error) {
      this.logger.error(`[updateMessage] Failed to update message for guild ${guildName}:`, error);
    }
  }

  async createGuild(
    guildName: string,
    guildId: string,
  ): Promise<{ role: Role | undefined; message: string; categoryId?: string }> {
    this.logger.debug(`[createGuild] Starting guild creation for: ${guildName}`);

    const guildServer = await this.client.guilds
      .fetch(guildId)
      .catch((error) => {
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
        name: `🕍 ${guildName}`,
        position: 1,
        color: '#A4F1FF',
      });

      this.logger.debug(395, ` [createGuild] Created role: ${role.name} (${role.id}) ${guildServer.id}`);
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
    state: 0 | 1 | 2 = 0,       // 0 = Voice, 1 = Stage, 2 = Text
    server?: any,               // ถ้ามี type ของ ServerDB ให้ใส่แทน any
    guildServer?: Guild,
    roles?: Role                // Guild role สำหรับ permission
  ) {
    this.logger.debug(`[createVoiceChannel] Creating channel: ${name} (state: ${state}, category: ${category.id}`);
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
          id: guildServer!.roles.everyone.id,
          deny: ['ViewChannel'],
        },
        // 🎭 ผู้มีเอกลักษณ์ - มองไม่เห็น
        ...(server?.eccentricRoleId ? [{
          id: server.eccentricRoleId,
          deny: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
        }] : []),
        // ⚔️ นักผจญภัย - มองไม่เห็น
        ...(server?.adventurerRoleId ? [{
          id: server.adventurerRoleId,
          deny: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
        }] : []),
        // 👥 ผู้เยี่ยมชม - มองไม่เห็น
        ...(server?.visitorRoleId ? [{
          id: server.visitorRoleId,
          deny: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
        }] : []),
        // 🕍 ชื่อกิลด์ - มองเห็น (เฉพาะสมาชิกกิลด์)
        ...(roles ? [{
          id: roles.id, // Guild role ID
          allow: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
        }] : []),
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
    state: 0 | 1 | 2 = 0,       // 0 = Voice, 1 = Stage, 2 = Text
    server?: any,               // ถ้ามี type ของ ServerDB ให้ใส่แทน any
    guildServer?: Guild,
    roles?: Role                // Guild role สำหรับ permission
  ) {
    this.logger.debug(`[createVoiceChannel] Creating channel: ${name} (state: ${state}, category: ${category.id}`);
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
          id: guildServer!.roles.everyone.id,
          allow: ['ViewChannel'],
        },
        // 🎭 ผู้มีเอกลักษณ์ - มองไม่เห็น
        ...(server?.eccentricRoleId ? [{
          id: server.eccentricRoleId,
          deny: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
        }] : []),
        // ⚔️ นักผจญภัย - มองไม่เห็น
        ...(server?.adventurerRoleId ? [{
          id: server.adventurerRoleId,
          deny: ['Connect', 'SendMessages', 'ReadMessageHistory'],
        }] : []),
        // 👥 ผู้เยี่ยมชม - มองไม่เห็น
        ...(server?.visitorRoleId ? [{
          id: server.visitorRoleId,
          deny: ['Connect', 'SendMessages', 'ReadMessageHistory'],
        }] : []),
        // 🕍 ชื่อกิลด์ - มองเห็น (เฉพาะสมาชิกกิลด์)
        ...(roles ? [{
          id: roles.id, // Guild role ID
          allow: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
        }] : []),
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
    this.logger.debug(`[createGiftHouseChannel] Creating gift house channel for category: ${guildId}`);
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
        // 🎭 ผู้มีเอกลักษณ์ - มองไม่เห็น (ยกเว้น Guild ตัวเอง)
        ...(server.eccentricRoleId ? [{
          id: server.eccentricRoleId,
          deny: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
        }] : []),
        // 🕍 ชื่อกิลด์ - มองเห็น (เจ้าของ Guild)
        {
          id: roles.id,
          allow: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
        },
        // ⚔️ นักผจญภัย - มองเห็น
        ...(server.adventurerRoleId ? [{
          id: server.adventurerRoleId,
          allow: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
        }] : []),
        // 👥 ผู้เยี่ยมชม - มองเห็น
        ...(server.visitorRoleId ? [{
          id: server.visitorRoleId,
          allow: ['ViewChannel', 'Connect', 'SendMessages', 'ReadMessageHistory'],
        }] : []),
      ];

      const channel = await guildServer.channels.create({
        name: `🎁・เยี่ยมบ้าน`,
        type: ChannelType.GuildVoice,
        parent: guildId,
        permissionOverwrites: permissionOverwrites as OverwriteResolvable[],
      });

      this.logger.debug(`[createGiftHouseChannel] Created gift house channel: ${channel.name} (${channel.id})`);
    } catch (error) {
      this.logger.error('Failed to create gift house channel:', error);
    }
  }

  private async createGuildEventChannel(roles: Role, guildId: string): Promise<void> {
    this.logger.debug(`[createGuildEventChannel] Creating guild event channel for category: ${guildId}`);
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

      this.logger.debug(`[createGuildEventChannel] Created guild event channel: ${channel.name} (${channel.id})`);
    } catch (error) {
      this.logger.error('Failed to create guild event channel:', error);
    }
  }

  private async createChannel(roles: Role, guildId: string): Promise<{ message: string; categoryId?: string }> {
    this.logger.debug(`[createChannel] Starting channel creation for role: ${roles.name} (${roles.id})`);
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

      // ตำแหน่งสร้างกิลล์
      this.logger.debug(`[createChannel] Getting position guild from register channel: ${server.registerChannel}`);
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
            id: guildServer!.roles.everyone.id,
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
          this.createPublicVoiceChannel(category, '👑・กิจกรรม', 0, server, guildServer, roles),
          this.createPublicVoiceChannel(category, '🎁・เยี่ยมบ้าน', 0, server, guildServer, roles),
          // ถ้าจะเปิดห้อง public ให้เปลี่ยน publicView = true
          // this.createVoiceChannel(category, '📣・ประชาสัมพันธ์', 2, true, server, guildServer, roles),
        ]);

      this.logger.debug(`[createChannel] All channels created successfully for role: ${roles.name}`);
      return { message: 'success', categoryId: category.id };
    } catch (error: any) {
      this.logger.error('Error in createChannel:', error);
      return { message: error.message || 'เกิดข้อผิดพลาดในการสร้างห้อง', categoryId: undefined };
    }
  }

}

export interface UserProfile extends UserDB {
  GuildMembers: GuildMembers[];
  meGuildCoinDB: MeGuildCoinDB | null;
}
