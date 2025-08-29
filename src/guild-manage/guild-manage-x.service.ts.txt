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
  PermissionFlagsBits,
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
  ) {}

  async onModuleInit() {
    this.logger.log('GuildManageService initialized');
  }

  async getGuild(user: User) {
    const guildMembers = await this.prisma.guildMembers.findFirst({
      where: { userId: user.id },
    });

    if (!guildMembers) return (this.guildDB = null);

    const guild = await this.prisma.guildDB.findFirst({
      where: { id: guildMembers.guildId },
    });

    this.guildDB = guild || null;
    return this.guildDB;
  }

  async checkGuild(userData: UserProfile) {
    try {
      return await this.prisma.guildMembers.findFirst({
        where: { userId: userData.discord_id },
      });
    } catch (error) {
      throw error;
    }
  }

  async cancelInviteCreate(interaction: ButtonInteraction, reportId: string) {
    try {
      const report = await this.prisma.guildCreateReport.findFirst({
        where: { id: reportId },
      });

      if (!report) {
        return interaction.reply({
          content: 'ไม่พบรายงานที่คุณต้องการยกเลิก',
          ephemeral: true,
        });
      }

      interaction.message.delete().catch(() => {});
      interaction.reply({
        content: `❌ **คำเชิญถูกปฏิเสธ**\n\n` +
                `คุณได้ปฏิเสธการเชิญเข้าร่วมก่อตั้งกิลด์ **${report.guildName}** แล้ว\n` +
                `ผู้สร้างกิลด์จะได้รับการแจ้งเตือนเกี่ยวกับการตัดสินใจของคุณ`,
        ephemeral: true,
      });

      if ('ownerId' in report && 'guildName' in report) {
        const user = await this.users.fetch(report.ownerId);
        if (user) {
          // Improved notification to guild creator
          const rejectEmbed = new EmbedBuilder({
            title: '💔 มีสมาชิกปฏิเสธการเชิญ',
            description: `**<@${interaction.user.id}>** ได้ปฏิเสธการเชิญเข้าร่วมก่อตั้งกิลด์ **${report.guildName}**`,
            color: 0xff4444,
            fields: [
              {
                name: '📊 สถานะปัจจุบัน',
                value: `การก่อตั้งกิลด์ถูกยกเลิกเนื่องจากไม่ได้รับการยืนยันจากสมาชิกทุกคน`,
                inline: false
              }
            ],
            timestamp: new Date()
          });
          
          user.send({
            embeds: [rejectEmbed]
          }).catch(() => {});
        }

        await this.prisma.guildCreateReport
          .delete({
            where: { id: reportId },
          })
          .catch(() => {});
      }
    } catch {
      interaction.message.delete().catch(() => {});
      interaction.reply({
        content: 'ยกเลิกคำขอสำเร็จ',
        ephemeral: true,
      });
    }
  }

  async acceptInviteCreate(interaction: ButtonInteraction, reportId: string) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const report = await this.prisma.guildCreateReport.findFirst({
        where: { id: reportId },
      });

      if (!report) {
        return interaction.editReply({
          content: 'ไม่พบรายงานที่คุณต้องการยอมรับ',
        });
      }

      // Check if invitation has expired
      if (new Date() > report.expiresAt) {
        return interaction.editReply({
          content: 'คำเชิญนี้หมดอายุแล้ว',
        });
      }

      // Check if user was actually invited
      if (!report.invitedMembers.includes(interaction.user.id)) {
        return interaction.editReply({
          content: 'คุณไม่ได้ถูกเชิญให้เข้าร่วมกิลด์นี้',
        });
      }

      // Check if user already confirmed
      if (report.confirmedMembers.includes(interaction.user.id)) {
        return interaction.editReply({
          content: 'คุณได้ยืนยันการเข้าร่วมแล้ว',
        });
      }

      // Add user to confirmed members
      const updatedConfirmedMembers = [...report.confirmedMembers, interaction.user.id];
      
      await this.prisma.guildCreateReport.update({
        where: { id: reportId },
        data: { confirmedMembers: { set: updatedConfirmedMembers } },
      });

      // Check if all invited members have confirmed (guild complete)
      if (updatedConfirmedMembers.length >= report.invitedMembers.length) {
        // All members confirmed - create the guild
        const guild = await this.prisma.guildDB.create({
          data: {
            guild_name: report.guildName,
            guild_roleId: null,
            guild_size: 10,
            guild_level: 1,
            guild_copper: 0,
            guild_leader: report.ownerId,
            Logo: '',
          },
        });

        if (!guild) {
          return interaction.editReply({
            content: 'ไม่สามารถสร้างกิลด์ใหม่ได้ โปรดทำการก่อตั้งกิลด์ใหม่',
          });
        }

        const members = await this.prisma.guildMembers.createMany({
          data: updatedConfirmedMembers.map((userId) => ({
            userId,
            position: userId === report.ownerId ? 'Leader' : 'Co-founder',
            guildId: guild.id,
          })),
        });

        if (!members.count) {
          await this.deleteData(guild);
          return interaction.editReply({
            content: 'ไม่สามารถเพิ่มสมาชิกลงในกิลด์ได้',
          });
        }

        const res = await this.createGuild(report.guildName, guild.id, interaction);
        if (!res.role || res.message !== 'success') {
          await this.deleteData(guild);
          await res.role?.delete();
          return interaction.editReply({
            content: `กิลด์ ${report.guildName} ของคุณได้รับอนุมัติแล้ว แต่ ${res.message}`,
          });
        }

        await this.prisma.guildDB.update({
          data: { guild_roleId: res.role.id },
          where: { id: guild.id },
        });

        interaction.editReply({
          content: '🎉 **ยินดีด้วย!** คุณได้เป็นผู้ร่วมก่อตั้งกิลด์สำเร็จ!\n\n' +
                  `✨ กิลด์ **${report.guildName}** ได้รับการก่อตั้งอย่างเป็นทางการแล้ว\n` +
                  '🏰 ห้องพูดคุยและกิจกรรมของกิลด์ได้ถูกสร้างขึ้นแล้ว\n' +
                  '👑 คุณได้รับสิทธิ์เป็น **ผู้ร่วมก่อตั้ง** พร้อมสิทธิพิเศษทั้งหมด!',
        });

        const targetServerId = this.getServerIdFromInteraction(interaction, report);
        const Interguild = await this.client.guilds.fetch(targetServerId);
        if (!Interguild) {
          return interaction.editReply({
            content: 'ไม่สามารถเข้าถึงดิสกิลด์ได้',
          });
        }

        const owner = await Interguild.members.fetch(report.ownerId);

        // Get server configuration for role IDs
        const serverConfig = await this.serverRepository.getServerById(targetServerId);
        
        // Add founder role to owner
        if (serverConfig?.guildHeadRoleId) {
          owner?.roles.add(serverConfig.guildHeadRoleId).catch((error) => {
            this.logger.error('Failed to add guild founder role to owner', error);
          });
        }
        owner?.roles.add(res.role).catch((error) => {
          this.logger.error('Failed to add guild role to owner', error);
        });

        for (const id of updatedConfirmedMembers.filter((id) => id !== report.ownerId)) {
          const member = await Interguild.members.fetch(id);
          if (member) {
            // Add co-founder role if configured
            if (serverConfig?.guildCoRoleId) {
              member.roles.add(serverConfig.guildCoRoleId).catch((error) => {
                this.logger.error(`Failed to add co-founder role to member ${id}`, error);
              });
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
          }
        }

        // Send completion message to guild creator
        this.updateMessage(report.channelId, report.messageId, report.guildName, updatedConfirmedMembers);

        await this.prisma.guildCreateReport.delete({ where: { id: reportId } }).catch(() => {});

        interaction.message.delete().catch(() => {
          this.logger.error('Failed to delete interaction message');
        });
      } else {
        // Some members still need to confirm
        const remainingCount = report.invitedMembers.length - updatedConfirmedMembers.length;
        interaction.editReply({
          content: `✅ **ยืนยันคำขอสำเร็จ!**\n\n` +
                  `🎯 คุณได้ยืนยันการเข้าร่วมกิลด์ **${report.guildName}** แล้ว\n` +
                  `⏳ กำลังรอสมาชิกอีก **${remainingCount} คน** ยืนยัน...\n` +
                  `📊 ความคืบหน้า: **${updatedConfirmedMembers.length}/${report.invitedMembers.length}**\n\n` +
                  `💡 เมื่อสมาชิกยืนยันครบ กิลด์จะถูกสร้างทันที!`,
        });
        
        interaction.message.delete().catch(() => {
          this.logger.error('Failed to delete interaction message');
        });

        // Send progress update to guild creator
        this.updateMessage(report.channelId, report.messageId, report.guildName, updatedConfirmedMembers);
      }
    } catch (error) {
      this.logger.error('Error in acceptInviteCreate', error);
      interaction.editReply({
        content: 'เกิดข้อผิดพลาดในการยืนยันคำขอ โปรดลองอีกครั้ง',
      });
    }
  }

  async deleteData(guildDB: GuildDB) {
    await this.prisma.guildDB.delete({ where: { id: guildDB.id } }).catch(() => {
      this.logger.error(`Failed to delete guild: ${guildDB.id}`);
    });
    await this.prisma.guildMembers.deleteMany({ where: { guildId: guildDB.id } }).catch(() => {
      this.logger.error(`Failed to delete guild members for guild: ${guildDB.id}`);
    });
  }

  async updateMessage(channelId: string, messageId: string, guildName: string, confirmedMembers: string[]) {
    try {
      // Find the guild report to get details
      const report = await this.prisma.guildCreateReport.findFirst({
        where: { messageId: messageId }
      });
      
      if (!report) {
        this.logger.error('Guild report not found for message update');
        return;
      }

      const guildCreator = await this.users.fetch(report.ownerId);
      if (!guildCreator) {
        this.logger.error('Guild creator not found');
        return;
      }

      const totalInvited = report.invitedMembers.length;
      const totalConfirmed = confirmedMembers.length;
      const isComplete = totalConfirmed >= totalInvited;

      const embed = new EmbedBuilder({
        color: isComplete ? 0xFFD700 : 16759101, // Gold if complete, original color otherwise
        image: {
          url: 'https://media.discordapp.net/attachments/861491684214833182/1224411890415829102/DALLE_2024-04-02_00.35.29_-_A_digital_illustration_of_a_group_of_adventurers_gathered_around_a_map_laid_out_on_a_rustic_wooden_table_their_expressions_serious_as_they_plan_their.webp?ex=661d656f&is=660af06f&hm=e9744b69a8c206d8b8f48fd1753bc9c5f2dd06d22ef7cac9b55cb986a43d08da&=&format=webp&width=839&height=479',
        },
        timestamp: new Date()
      });

      if (isComplete) {
        embed.setDescription(`# 🎉 กิลด์ ${guildName} ได้รับการก่อตั้งอย่างเป็นทางการแล้ว`);
        embed.addFields({
          name: '👥 สมาชิกผู้ก่อตั้ง',
          value: confirmedMembers.map(id => `<@${id}>`).join('\n'),
          inline: false
        });
        
        // Try to edit the original DM message first
        try {
          const channel = await this.client.channels.fetch(channelId);
          if (channel && channel.isDMBased()) {
            const message = await channel.messages.fetch(messageId);
            if (message) {
              await message.edit({
                content: `🎊 **การสร้างกิลด์ "${guildName}" เสร็จสมบูรณ์!**`,
                embeds: [embed],
                components: [] // Remove dismiss button when complete
              });
              return; // Successfully edited, no need to send new message
            }
          }
        } catch (editError) {
          this.logger.warn('Could not edit original DM, sending new message instead');
        }
      } else {
        embed.setDescription(`# ความคืบหน้า (${totalConfirmed}/${totalInvited}) ของกิลด์ ${guildName}`);
        embed.addFields(
          {
            name: '✅ ยืนยันแล้ว',
            value: confirmedMembers.map(id => `<@${id}>`).join('\n') || 'ไม่มี',
            inline: true
          },
          {
            name: '⏳ รอการยืนยัน',
            value: report.invitedMembers
              .filter(id => !confirmedMembers.includes(id))
              .map(id => `<@${id}>`)
              .join('\n') || 'ไม่มี',
            inline: true
          }
        );

        // Try to edit the original DM message first
        try {
          const channel = await this.client.channels.fetch(channelId);
          if (channel && channel.isDMBased()) {
            const message = await channel.messages.fetch(messageId);
            if (message) {
              await message.edit({
                content: `🔄 **อัปเดตความคืบหน้า "${guildName}"** - ${new Date().toLocaleTimeString('th-TH')}`,
                embeds: [embed]
              });
              return; // Successfully edited, no need to send new message
            }
          }
        } catch (editError) {
          this.logger.warn('Could not edit original DM, sending new message instead');
        }
      }

      // Fallback: Send a new DM message if editing failed
      await guildCreator.send({
        content: isComplete 
          ? `🎊 **การสร้างกิลด์ "${guildName}" เสร็จสมบูรณ์!**`
          : `🔄 **อัปเดตความคืบหน้า "${guildName}"** - ${new Date().toLocaleTimeString('th-TH')}`,
        embeds: [embed]
      }).catch((error) => {
        this.logger.error('Failed to send progress update to guild creator', error);
      });

    } catch (error) {
      this.logger.error('Failed to update guild progress', error);
    }
  }

  /**
   * ตรวจจับ Discord Server ID จาก interaction หรือ report (improved)
   */
  private getServerIdFromInteraction(interaction?: any, report?: any): string {
    // First priority: interaction.guild (same as server-register)
    if (interaction?.guild?.id) {
      this.logger.log(`✅ Detected guild ID from interaction.guild: ${interaction.guild.name} (${interaction.guild.id})`);
      return interaction.guild.id;
    }

    // Second priority: interaction guild ID
    if (interaction?.guildId) {
      this.logger.log(`✅ Detected guild ID from interaction.guildId: ${interaction.guildId}`);
      return interaction.guildId;
    }
    
    // Third priority: report server ID
    if (report?.serverId) {
      this.logger.log(`✅ Using guild ID from report: ${report.serverId}`);
      return report.serverId;
    }
    
    // Fallback to environment variable with validation
    const envGuildId = process.env.DISCORD_GUILD_ID;
    if (!envGuildId) {
      this.logger.error('❌ DISCORD_GUILD_ID environment variable is not set!');
      throw new Error('Server detection failed: No guild information available and DISCORD_GUILD_ID is undefined');
    }

    this.logger.warn(`⚠️ Using fallback guild ID from environment: ${envGuildId}`);
    return envGuildId;
  }

  /**
   * Enhanced function to detect Discord server from various sources
   * ฟังก์ชันที่ปรับปรุงแล้วเพื่อตรวจจับเซิร์ฟเวอร์ Discord จากแหล่งต่างๆ
   */
  public detectDiscordServer(options: {
    interaction?: any;
    report?: any;
    channelId?: string;
    userId?: string;
  }): Promise<{ serverId: string; serverName?: string; source: string }> {
    return new Promise(async (resolve) => {
      const { interaction, report, channelId, userId } = options;

      // Priority 1: Direct interaction guild ID
      if (interaction?.guildId) {
        try {
          const guild = await this.client.guilds.fetch(interaction.guildId);
          this.logger.log(`✅ Server detected from interaction: ${guild.name} (${guild.id})`);
          resolve({
            serverId: guild.id,
            serverName: guild.name,
            source: 'interaction'
          });
          return;
        } catch (error) {
          this.logger.error('Failed to fetch guild from interaction:', error);
        }
      }

      // Priority 2: Report server ID
      if (report?.serverId) {
        try {
          const guild = await this.client.guilds.fetch(report.serverId);
          this.logger.log(`✅ Server detected from report: ${guild.name} (${guild.id})`);
          resolve({
            serverId: guild.id,
            serverName: guild.name,
            source: 'report'
          });
          return;
        } catch (error) {
          this.logger.error('Failed to fetch guild from report:', error);
        }
      }

      // Priority 3: Channel ID lookup
      if (channelId) {
        try {
          const channel = await this.client.channels.fetch(channelId);
          if (channel && 'guild' in channel && channel.guild) {
            this.logger.log(`✅ Server detected from channel: ${channel.guild.name} (${channel.guild.id})`);
            resolve({
              serverId: channel.guild.id,
              serverName: channel.guild.name,
              source: 'channel'
            });
            return;
          }
        } catch (error) {
          this.logger.error('Failed to fetch guild from channel:', error);
        }
      }

      // Priority 4: User mutual guild lookup
      if (userId) {
        try {
          const user = await this.client.users.fetch(userId);
          const mutualGuilds = this.client.guilds.cache.filter(guild => 
            guild.members.cache.has(userId)
          );
          
          if (mutualGuilds.size > 0) {
            const firstGuild = mutualGuilds.first();
            this.logger.log(`✅ Server detected from user mutual guilds: ${firstGuild.name} (${firstGuild.id})`);
            resolve({
              serverId: firstGuild.id,
              serverName: firstGuild.name,
              source: 'user_mutual'
            });
            return;
          }
        } catch (error) {
          this.logger.error('Failed to detect guild from user:', error);
        }
      }

      // Fallback: Environment variable
      const fallbackServerId = process.env.DISCORD_GUILD_ID;
      try {
        const guild = await this.client.guilds.fetch(fallbackServerId);
        this.logger.log(`⚠️ Using fallback server: ${guild.name} (${guild.id})`);
        resolve({
          serverId: guild.id,
          serverName: guild.name,
          source: 'environment'
        });
      } catch (error) {
        this.logger.error('Failed to fetch fallback guild:', error);
        resolve({
          serverId: fallbackServerId,
          source: 'environment_fallback'
        });
      }
    });
  }

  async createGuild(
    guildName: string,
    guildId: any = null,
    interaction?: any,
  ): Promise<{ role: Role | undefined; message: string }> {
    const targetServerId = this.getServerIdFromInteraction(interaction);
    
    // Validate server registration before creating guild
    const serverConfig = await this.serverRepository.getServerById(targetServerId);
    if (!serverConfig) {
      this.logger.error(`Cannot create guild: Server ${targetServerId} is not registered`);
      return { role: undefined, message: 'เซิร์ฟเวอร์ยังไม่ได้ลงทะเบียน กรุณาลงทะเบียนก่อนใช้งาน' };
    }

    if (!serverConfig.openBot) {
      this.logger.error(`Cannot create guild: Server ${targetServerId} has bot disabled`);
      return { role: undefined, message: 'การใช้งานบอทถูกปิดในเซิร์ฟเวอร์นี้' };
    }
    
    const guildServer = await this.client.guilds
      .fetch(targetServerId)
      .catch((error) => {
        this.logger.error('Failed to fetch guild:', error);
        return undefined;
      });

    if (!guildServer) {
      return { role: undefined, message: 'ไม่สามารถเข้าถึงดิสกิลด์ได้' };
    }

    this.logger.log(`Creating guild "${guildName}" in server: ${guildServer.name} (${guildServer.id}) - Registered: ${serverConfig.serverName}`);

    // const positionRole = guildServer.roles.cache.get(
    //   "1372551247571451934",
    // );
    // const position = positionRole ? positionRole.position - 1 : undefined;

    try {
      const role = await guildServer.roles.create({
        name: `🕍 ${guildName}`,
        position: 1,
        color: '#A4F1FF',
      });

      const message = await this.createChannel(role, targetServerId);
      return { role, message };
    } catch (error) {
      this.logger.error('Error creating guild room', error);
      return { role: undefined, message: 'ไม่สามารถสร้างห้องกิลด์ได้' };
    }
  }

  private async createGiftHouseChannel(categoryId: string, roles: Role, serverId: string): Promise<void> {
    try {
      const guildServer = await this.client.guilds.fetch(serverId);
      if (!guildServer) {
        this.logger.error('Failed to fetch guild');
        return;
      }

      await guildServer.channels.create({
        name: `🎁・เยี่ยมบ้าน`,
        type: ChannelType.GuildVoice,
        parent: categoryId,
        permissionOverwrites: [
          {
            id: guildServer.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: roles.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
          },
        ],
      });
    } catch (error) {
      this.logger.error('Failed to create gift house channel:', error);
    }
  }

  private async createGuildEventChannel(categoryId: string, roles: Role, serverId: string): Promise<void> {
    try {
      const guildServer = await this.client.guilds.fetch(serverId);
      if (!guildServer) {
        this.logger.error('Failed to fetch guild');
        return;
      }

      await guildServer.channels.create({
        name: `👑・กิจกรรมกิลด์`,
        type: ChannelType.GuildStageVoice,
        parent: categoryId,
        permissionOverwrites: [
          {
            id: guildServer.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: roles.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.RequestToSpeak],
          },
        ],
      });
    } catch (error) {
      this.logger.error('Failed to create guild event channel:', error);
    }
  }

  private async createChannel(roles: Role, serverId: string): Promise<string> {
    try {
      const guildServer = await this.client.guilds.fetch(serverId);
      if (!guildServer) {
        this.logger.error('Failed to fetch guild');
        return 'ไม่สามารถเข้าถึงดิสกิลด์ได้';
      }

      const server = await this.serverRepository.getServerById(guildServer.id);
      if (!server) {
        this.logger.error('Failed to fetch server configuration');
        return 'ไม่สามารถเข้าถึงข้อมูลการตั้งค่าเซิร์ฟเวอร์ได้';
      }
      
      // ตำแหน่งสร้างกิลล์ - ใช้ meguildPositionCreate จาก ServerDB
      const guildPositionChannelId = server.meguildPositionCreate || server.registerChannel;
      const positionGuild = guildServer.channels.cache.get(
        guildPositionChannelId,
      ) as CategoryChannel;

      const category = await guildServer.channels.create({
        name: roles.name,
        type: ChannelType.GuildCategory,
        ...(positionGuild ? { position: positionGuild.position + 1 } : {}),
        permissionOverwrites: [
          {
            id: guildServer.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: roles.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          },
        ],
      });

      if (!category) {
        this.logger.error('Failed to create guild category');
        return 'ไม่สามารถสร้างห้องหมวดหมู่กิลด์ได้';
      }

      const createVoiceChannel = async (name: string, state = 0, publicView = false) => {
        try {
          const channelType = state === 0
            ? ChannelType.GuildVoice
            : state === 1
              ? ChannelType.GuildStageVoice
              : ChannelType.GuildText;

          const basePermissions = [
            {
              id: guildServer.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: roles.id,
              allow: channelType === ChannelType.GuildText 
                ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions, PermissionFlagsBits.UseExternalEmojis]
                : [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
            }
          ];

          const permissions = publicView
            ? [
                {
                  id: process.env.DISCORD_GUILD_CATEGORY_ID_PARTY,
                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                },
                {
                  id: roles.id,
                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
                }
              ]
            : basePermissions;

          const voiceChannel = await guildServer.channels.create({
            type: channelType,
            name,
            parent: category.id,
            permissionOverwrites: permissions,
          });

          return voiceChannel;
        } catch (error) {
          this.logger.error(`Failed to create channel ${name}:`, error);
          throw new Error(`ไม่สามารถสร้างห้อง ${name} ได้`);
        }
      };

      await Promise.all([
        createVoiceChannel('💬・แชท', 2),
        createVoiceChannel('🎤・โถงหลัก', 0),
        createVoiceChannel('🎤・โถงรอง', 0),
        this.createGiftHouseChannel(category.id, roles, serverId),
        this.createGuildEventChannel(category.id, roles, serverId),
      ]);

      return 'success';
    } catch (error: any) {
      this.logger.error('Error in createChannel:', error);
      return error.message || 'เกิดข้อผิดพลาดในการสร้างห้อง';
    }
  }
}

export interface UserProfile extends UserDB {
  GuildMembers: GuildMembers[];
  meGuildCoinDB: MeGuildCoinDB | null;
}
