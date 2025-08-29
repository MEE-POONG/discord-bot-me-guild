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
  GuildMember,
  Role,
  TextChannel,
  User,
  UserManager,
  VoiceChannel,
} from 'discord.js';
import { ServerRepository } from 'src/repository/server';

@Injectable()
export class GuildManageService {
  private readonly logger = new Logger(GuildManageService.name);
  public guildDB: GuildDB | null = null;

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
      return (this.guildDB = null);
    }

    const guild = await this.prisma.guildDB.findFirst({
      where: { id: guildMembers.guildId },
    });

    this.logger.debug(`[getGuild] Found guild:`, guild);

    this.guildDB = guild || null;
    this.logger.debug(`[getGuild] Final guildDB result:`, this.guildDB);
    return this.guildDB;
  }

  async checkGuild(userData: UserProfile) {
    this.logger.debug(`[checkGuild] Checking guild for user: ${userData.discord_id}`);
    try {
      const result = await this.prisma.guildMembers.findFirst({
        where: { userId: userData.discord_id },
      });
      this.logger.debug(`[checkGuild] Result:`, result);
      return result;
    } catch (error) {
      this.logger.error(`[checkGuild] Error checking guild for user ${userData.discord_id}:`, error);
      throw error;
    }
  }

  async cancelInviteCreate(interaction: ButtonInteraction, reportId: string) {
    this.logger.debug(`[cancelInviteCreate] Starting cancel for reportId: ${reportId} by user: ${interaction.user.id}`);
    try {
      const report = await this.prisma.guildCreateReport.findFirst({
        where: { id: reportId },
      });

      this.logger.debug(`[cancelInviteCreate] Found report:`, report);

      if (!report) {
        this.logger.warn(`[cancelInviteCreate] Report not found: ${reportId}`);
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
            where: { id: reportId },
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

  async acceptInviteCreate(interaction: ButtonInteraction, reportId: string) {
    this.logger.debug(`128 [acceptInviteCreate] Starting accept for reportId: ${reportId} by user: ${interaction.user.id} `);
    try {
      await interaction.deferReply({ ephemeral: true });
      console.log(131);

      const report = await this.prisma.guildCreateReport.findFirst({
        where: { serverId: reportId },
      });
      console.log(135);

      this.logger.debug(`[acceptInviteCreate] Found report:`, report);
      console.log(139);

      if (!report) {
        this.logger.warn(`[acceptInviteCreate] Report not found: ${reportId}`);
        return interaction.editReply({
          content: 'ไม่พบรายงานที่คุณต้องการยอมรับ',
        });
      }
      console.log(147);

      if (report.confirmedMembers.length >= 1) {
        this.logger.debug(`[acceptInviteCreate] Creating guild with ${report.confirmedMembers.length} confirmed members`);
        const membersList = [...report.confirmedMembers, interaction.user.id];
        this.logger.debug(`[acceptInviteCreate] Members list:`, membersList);
        console.log(154);
        // สร้าง Discord guild ก่อนเพื่อได้ category ID
        this.logger.debug(195,`[acceptInviteCreate] Creating Discord guild first to get category ID for: ${report.guildName}`);
        const res = await this.createGuild(report.guildName, report.serverId);
        this.logger.debug(200,`[acceptInviteCreate] Create guild result:`, res);
        console.log(200);
        
        if (!res.role || res.message !== 'success') {
          this.logger.error(`[acceptInviteCreate] Failed to create Discord guild: ${res.message}`);
          return interaction.editReply({
            content: `กิลด์ ${report.guildName} ของคุณได้รับอนุมัติแล้ว แต่ ${res.message}`,
          });
        }

        // ใช้ category ID ที่ได้จาก Discord เป็น ID ของ GuildDB
        const categoryId = res.categoryId; // ใช้ category ID ที่ได้จากการสร้าง
        this.logger.debug(`[acceptInviteCreate] Using category ID as guild ID: ${categoryId}`);
        
        const guild = await this.prisma.guildDB.create({
          data: {
            id: categoryId, // ใช้ category ID แทน auto-generated ID
            guild_name: report.guildName,
            guild_roleId: res.role.id,
            guild_size: 10,
            guild_level: 1,
            guild_copper: 0,
            guild_leader: report.ownerId,
            Logo: '',
          },
        });
        console.log(166);
        this.logger.debug(166,` [acceptInviteCreate] Created guild:`, guild);

        if (!guild) {
          this.logger.error(`[acceptInviteCreate] Failed to create guild for report: ${reportId}`);
          return interaction.editReply({
            content: 'ไม่สามารถสร้างกิลด์ใหม่ได้ โปรดทำการก่อตั้งกิลด์ใหม่',
          });
        }
        console.log(175);
        this.logger.debug(176,`[acceptInviteCreate] Creating guild members for guild: ${guild.id}`);
        const members = await this.prisma.guildMembers.createMany({
          data: membersList.map((userId) => ({
            userId,
            position: userId === report.ownerId ? 'Leader' : 'Co-founder',
            guildId: guild.id,
          })),
        });
        console.log(185);
        this.logger.debug(186,`[acceptInviteCreate] Created ${members.count} guild members`);

        if (!members.count) {
          this.logger.error(`[acceptInviteCreate] Failed to create guild members for guild: ${guild.id}`);
          await this.deleteData(guild);
          return interaction.editReply({
            content: 'ไม่สามารถเพิ่มสมาชิกลงในกิลด์ได้',
          });
        }
        console.log(214);
        this.logger.debug(215,`[acceptInviteCreate] Replying success to user`);
        interaction.editReply({
          content: 'ยืนยันคำขอสำเร็จ',
        });
        console.log(218);
        this.logger.debug(219,`[acceptInviteCreate] Fetching Discord guild: ${report.serverId}`);
        const Interguild = await this.client.guilds.fetch(report.serverId);
        if (!Interguild) {
          this.logger.error(`[acceptInviteCreate] Failed to fetch Discord guild: ${report.serverId}`);
          return interaction.editReply({
            content: 'ไม่สามารถเข้าถึงดิสกิลด์ได้',
          });
        }
        console.log(229);
        this.logger.debug(230,`[acceptInviteCreate] Fetching owner: ${report.ownerId}`);
        const owner = await Interguild.members.fetch(report.ownerId);
        console.log(232);
        this.logger.debug(233,`[acceptInviteCreate] Adding roles to owner: ${report.ownerId}`);
        owner?.roles.add(process.env.DISCORD_GUILD_FOUNDER_ROLE_ID).catch((error) => {
          this.logger.error('Failed to add guild founder role to owner', error);
        });
        owner?.roles.add(res.role).catch((error) => {
          this.logger.error('Failed to add guild role to owner', error);
        });
        console.log(239);
        const coFounders = membersList.filter((id) => id !== report.ownerId);
        this.logger.debug(242,`[acceptInviteCreate] Processing ${coFounders.length} co-founders:`, coFounders);
        console.log(242);
        for (const id of coFounders) {
          this.logger.debug(243,`[acceptInviteCreate] Processing co-founder: ${id}`);
          const member = await Interguild.members.fetch(id);
          if (member) {
            member.roles.add(process.env.DISCORD_GUILD_CO_FOUNDER_ROLE_ID).catch((error) => {
              this.logger.error(`Failed to add co-founder role to member ${id}`, error);
            });
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
        console.log(264);
        this.logger.debug(265,` [acceptInviteCreate] Updating message and cleaning up`);
        this.updateMessage(report.channelId, report.messageId, report.guildName, membersList);
        console.log(268);
        await this.prisma.guildCreateReport.delete({ where: { id: reportId } }).catch(() => { });
        console.log(271);
        interaction.message.delete().catch(() => {
          this.logger.error('Failed to delete interaction message');
        });
      } else {
        this.logger.debug(278,` [acceptInviteCreate] Adding user to confirmed members (not enough members yet)`);
        await this.prisma.guildCreateReport.update({
          data: { confirmedMembers: { push: interaction.user.id } },
          where: { id: reportId },
        });
        console.log(278);
        this.logger.debug(279,` [acceptInviteCreate] Replying success and updating message`);
        interaction.editReply({
          content: 'ยืนยันคำขอสำเร็จ',
        });
        interaction.message.delete().catch(() => {
          this.logger.error('Failed to delete interaction message');
        });
        console.log(288);
        this.updateMessage(report.channelId, report.messageId, report.guildName, [
          ...report.confirmedMembers,
          interaction.user.id,
        ]);
        console.log(293);
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
      const channel = (await this.client.channels.fetch(channelId)) as TextChannel | VoiceChannel;
      if (!channel) {
        this.logger.warn(`[updateMessage] Channel not found: ${channelId}`);
        return;
      }

      const message = await channel.messages.fetch(messageId);
      if (!message) {
        this.logger.warn(`[updateMessage] Message not found: ${messageId}`);
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

      await message.edit({ embeds: [embed] }).catch(() => {
        this.logger.error('Failed to edit message');
      });
    } catch (error) {
      this.logger.error('Failed to fetch channel or message:', error);
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
      console.log(372, ' guildServer', guildServer);
      console.log(373, ' guildName', guildName);

      this.logger.debug(375, `[createGuild] Creating role for guild: ${guildName}`);
      const role = await guildServer.roles.create({
        name: `🕍 ${guildName}`,
        position: 1,
        color: '#A4F1FF',
      });

      this.logger.debug(382, ` [createGuild] Created role: ${role.name} (${role.id}) ${guildServer.id}`);
      this.logger.debug(383, `[createGuild] Creating channels for guild: ${role.name}`);

      const channelResult = await this.createChannel(role, guildServer.id);
      this.logger.log(387, 'role', role);
      this.logger.log(388, 'channelResult', channelResult);

      this.logger.debug(389, `[createGuild] Guild creation completed for: ${guildName}`);
      return { role, message: channelResult.message, categoryId: channelResult.categoryId };
    } catch (error) {
      this.logger.error('Error creating guild room', error);
      return { role: undefined, message: 'ไม่สามารถสร้างห้องกิลด์ได้', categoryId: undefined };
    }
  }

  private async createGiftHouseChannel(categoryId: string, roles: Role): Promise<void> {
    this.logger.debug(`[createGiftHouseChannel] Creating gift house channel for category: ${categoryId}`);
    try {
      const guildServer = await this.client.guilds.fetch(process.env.DISCORD_GUILD_ID);
      if (!guildServer) {
        this.logger.error('Failed to fetch guild');
        return;
      }

      const channel = await guildServer.channels.create({
        name: `🎁・เยี่ยมบ้าน`,
        type: ChannelType.GuildVoice,
        parent: categoryId,
        permissionOverwrites: [
          {
            id: roles.id,
            allow: ['ViewChannel', 'Connect'],
          },
        ],
      });

      this.logger.debug(`[createGiftHouseChannel] Created gift house channel: ${channel.name} (${channel.id})`);
    } catch (error) {
      this.logger.error('Failed to create gift house channel:', error);
    }
  }

  private async createGuildEventChannel(categoryId: string, roles: Role): Promise<void> {
    this.logger.debug(`[createGuildEventChannel] Creating guild event channel for category: ${categoryId}`);
    try {
      const guildServer = await this.client.guilds.fetch(process.env.DISCORD_GUILD_ID);
      if (!guildServer) {
        this.logger.error('Failed to fetch guild');
        return;
      }

      const channel = await guildServer.channels.create({
        name: `👑・กิจกรรมกิลด์`,
        type: ChannelType.GuildStageVoice,
        parent: categoryId,
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

      const createVoiceChannel = async (name: string, state = 0, publicView = false) => {
        this.logger.debug(`[createChannel] Creating voice channel: ${name} (state: ${state}, public: ${publicView})`);
        try {
          const voiceChannel = await category.children.create({
            type:
              state === 0
                ? ChannelType.GuildVoice
                : state === 1
                  ? ChannelType.GuildStageVoice
                  : ChannelType.GuildText,
            name,
            permissionOverwrites: publicView
              ? [
                {
                  // ตำแหน่งสร้างห้องกิลด์ process.env.DISCORD_GUILD_CATEGORY_ID_PARTY เปลี่ยนเป็น ServerDB.welcomechannel
                  id: server.welcomechannel,
                  allow: ['ViewChannel', 'Connect'],
                },
              ]
              : [
                {
                  id: guildServer.roles.everyone.id,
                  deny: ['ViewChannel'],
                },
              ],
          });

          this.logger.debug(`[createChannel] Created voice channel: ${voiceChannel.name} (${voiceChannel.id})`);
          return voiceChannel;
        } catch (error) {
          this.logger.error(`Failed to create channel ${name}:`, error);
          throw new Error(`ไม่สามารถสร้างห้อง ${name} ได้`);
        }
      };

      this.logger.debug(`[createChannel] Creating all channels for guild`);
      await Promise.all([
        createVoiceChannel('💬・แชท', 2),
        createVoiceChannel('🎤・โถงหลัก', 0),
        createVoiceChannel('🎤・โถงรอง', 0),
        this.createGiftHouseChannel(category.id, roles),
        this.createGuildEventChannel(category.id, roles),
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
