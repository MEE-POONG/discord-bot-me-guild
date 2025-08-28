import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { GuildCreateDto } from './dto/length.dto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChannelManager,
  ChatInputCommandInteraction,
  Client,
  ClientVoiceManager,
  EmbedBuilder,
  GuildManager,
  GuildMember,
  ModalSubmitInteraction,
  REST,
  ShardClientUtil,
  TextChannel,
  UserManager,
  UserSelectMenuBuilder,
  WebSocketManager,
} from 'discord.js';
import { GuildManageService, UserProfile } from 'src/guild-manage/guild-manage.service';
import { UserDataService } from 'src/user-data/user-data.service';
import { ServerRepository } from 'src/repository/server';
import { Button, ButtonContext, Context, On, StringSelectContext } from 'necord';

@Injectable()
export class GuildCreateService {
  private readonly logger = new Logger(GuildCreateService.name);
  private guildReportId: string;
  constructor(
    private readonly prisma: PrismaClient,
    private readonly guildManage: GuildManageService,
    private readonly userData: UserDataService,
    private readonly serverRepository: ServerRepository,

    private readonly client: Client,
    private readonly channels: ChannelManager,
    private readonly guilds: GuildManager,
    private readonly users: UserManager,
    private readonly shard: ShardClientUtil,
    private readonly voice: ClientVoiceManager,
    private readonly ws: WebSocketManager,
    private readonly rest: REST,
  ) {}

  /**
   * ตรวจจับเซิร์ฟเวอร์ Discord จาก interaction (using same approach as server-register)
   */
  private detectServerFromInteraction(interaction: ChatInputCommandInteraction<CacheType> | ModalSubmitInteraction<CacheType>): {
    serverId: string;
    serverName?: string;
    source: string;
  } {
    // Method 1: Use interaction.guild (same as server-register)
    if (interaction.guild) {
      this.logger.log(`✅ Server detected from interaction.guild: ${interaction.guild.name} (${interaction.guild.id})`);
      return {
        serverId: interaction.guild.id,
        serverName: interaction.guild.name,
        source: 'interaction.guild'
      };
    }

    // Method 2: Use interaction.guildId
    if (interaction.guildId) {
      this.logger.log(`✅ Server detected from interaction.guildId: ${interaction.guildId}`);
      return {
        serverId: interaction.guildId,
        source: 'interaction.guildId'
      };
    }

    // Method 3: Check environment variable and warn if undefined
    const envGuildId = process.env.DISCORD_GUILD_ID;
    if (!envGuildId) {
      this.logger.error('❌ DISCORD_GUILD_ID environment variable is not set!');
      throw new Error('Server detection failed: No guild information available and DISCORD_GUILD_ID is undefined');
    }

    this.logger.warn(`⚠️ Using fallback server ID from environment: ${envGuildId}`);
    return {
      serverId: envGuildId,
      source: 'environment'
    };
  }

  async onModuleInit() {
    this.logger.log('GuildCreateService initialized');
    
    // Check environment variables on startup
    if (!process.env.DISCORD_GUILD_ID) {
      this.logger.warn('⚠️ DISCORD_GUILD_ID environment variable is not set. Guild creation will depend on interaction.guild detection.');
    } else {
      this.logger.log(`✅ DISCORD_GUILD_ID configured: ${process.env.DISCORD_GUILD_ID}`);
    }
  }

  /**
   * ตรวจสอบว่าเซิร์ฟเวอร์ได้ลงทะเบียนและอนุญาตให้สร้างกิลด์หรือไม่
   */
  private async checkServerRegistration(serverId: string): Promise<{
    isAllowed: boolean;
    message?: string;
    serverConfig?: any;
  }> {
    try {
      const serverConfig = await this.serverRepository.getServerById(serverId);
      
      if (!serverConfig) {
        this.logger.warn(`⚠️ Server ${serverId} is not registered`);
        return {
          isAllowed: false,
          message: '🚫 **เซิร์ฟเวอร์ยังไม่ได้ลงทะเบียน**\n\n' +
                  '📋 เซิร์ฟเวอร์นี้ยังไม่ได้ลงทะเบียนเพื่อใช้งานบอท\n' +
                  '👑 กรุณาให้เจ้าของเซิร์ฟเวอร์ใช้คำสั่ง `/server register` ก่อน\n' +
                  '💡 หลังจากลงทะเบียนแล้วจึงจะสามารถใช้งานฟีเจอร์การสร้างกิลด์ได้'
        };
      }

      if (!serverConfig.openBot) {
        this.logger.warn(`⚠️ Server ${serverId} has bot disabled`);
        return {
          isAllowed: false,
          message: '🔒 **การใช้งานบอทถูกปิด**\n\n' +
                  '⚙️ เซิร์ฟเวอร์นี้ได้ปิดการใช้งานบอทชั่วคราว\n' +
                  '👑 กรุณาติดต่อเจ้าของเซิร์ฟเวอร์เพื่อเปิดใช้งาน\n' +
                  '🎯 คุณสามารถใช้งานฟีเจอร์อื่นๆ ได้หลังจากเปิดใช้งานแล้ว'
        };
      }

      this.logger.log(`✅ Server ${serverId} (${serverConfig.serverName}) is registered and active`);
      return {
        isAllowed: true,
        serverConfig
      };
    } catch (error) {
      this.logger.error('Error checking server registration:', error);
      return {
        isAllowed: false,
        message: '⚠️ **เกิดข้อผิดพลาดในการตรวจสอบเซิร์ฟเวอร์**\n\n' +
                '🔧 ไม่สามารถตรวจสอบสถานะการลงทะเบียนของเซิร์ฟเวอร์ได้\n' +
                '🔄 กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ'
      };
    }
  }

  async createGuild(
    interaction: ChatInputCommandInteraction<CacheType> | ModalSubmitInteraction<CacheType>,
    options: GuildCreateDto,
  ) {
    try {
      // Detect which Discord server this command came from
      const serverInfo = this.detectServerFromInteraction(interaction);
      this.logger.log(`🎯 Guild creation initiated in server: ${serverInfo.serverName || serverInfo.serverId} (Source: ${serverInfo.source})`);

      // Check if the server is registered and allows guild creation
      const serverConfig = await this.checkServerRegistration(serverInfo.serverId);
      if (!serverConfig.isAllowed) {
        return interaction.reply({
          content: serverConfig.message,
          ephemeral: true,
        });
      }

      const ownerData = (await this.userData.getProfile(interaction.user)) as UserProfile;

    if (!ownerData)
      return interaction.reply({
        content: `คุณไม่สามารถสร้างกิลด์ได้ เนื่องจากคุณไม่มีข้อมูลนักผจญภัย โปรดลงทะเบียนก่อนสร้างกิลด์`,
        ephemeral: true,
      });

    const guildName = options.guildName;
    if (guildName.length < 4 || guildName.length > 16)
      return interaction.reply({
        content: `ชื่อกิลด์ของคุณต้องมีความยาวระหว่าง 4-16 ตัวอักษร`,
        ephemeral: true,
      });

    if (!/^[a-zA-Z0-9_]+$/.test(guildName))
      return interaction.reply({
        content: `ชื่อกิลด์ของคุณผิดกฏ อนุญาตให้ใช้เพียง aA-zZ, 0-9 และ _ เท่านั้น `,
        ephemeral: true,
      });

    const time = `<t:${(Date.now() / 1000 + 600).toFixed(0)}:R>`;

    if (await this.guildManage.checkGuild(ownerData))
      return interaction.reply({
        content: `คุณไม่สามารถสร้างกิลด์ได้เนื่องจากคุณมีกิลด์อยู่แล้ว`,
        ephemeral: true,
      });

    const createEmbedFounded = new EmbedBuilder({
      title: 'เลือกผู้ร่วมก่อตั้งสมาชิกของคุณ (1/4) คน',
      description: `- คุณจำเป็นที่จะต้องมีผู้ร่วมก่อตั้งกิลด์ 4 คน เพื่อทำการสร้างกิลด์\n- ระยะเวลาในการยอมรับ ${time}`,
      color: 9304831,
      image: {
        url: 'https://media.discordapp.net/attachments/861491684214833182/1224408324922015876/DALLE_2024-04-02_00.21.20_-_A_vibrant_watercolor_of_an_elven_archer_a_human_mage_and_a_dwarf_warrior_standing_triumphantly_atop_a_hill_looking_towards_the_horizon_at_dawn._The.webp?ex=661d621d&is=660aed1d&hm=29e373d7dea2b16ceddf3e45271ca343bf01c5e5b2bbfc1ee263503f04900ca7&=&format=webp&width=839&height=479',
      },
    });

    const createSelectMemberForFounded =
      new ActionRowBuilder<UserSelectMenuBuilder>().setComponents(
        new UserSelectMenuBuilder()
          .setCustomId(`select_founded_id_${interaction.user.id}`)
          .setMaxValues(10)
          .setMinValues(1)
          .setPlaceholder('โปรดเลือกผู้เริ่มก่อตั้ง'),
      );

      await this.interactionHandler(
        interaction as ChatInputCommandInteraction<CacheType>,
        createEmbedFounded,
        createSelectMemberForFounded,
        guildName,
      );
    } catch (error) {
      this.logger.error('Error in createGuild:', error);
      
      // Handle interaction reply if not already replied
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: '⚠️ เกิดข้อผิดพลาดในการสร้างกิลด์ โปรดลองอีกครั้งในภายหลัง',
          ephemeral: true,
        }).catch(() => {
          this.logger.error('Failed to send error message to user');
        });
      }
    }
  }

  private async interactionHandler(
    interaction: ChatInputCommandInteraction<CacheType>,
    createEmbedFounded: EmbedBuilder,
    createSelectMemberForFounded: ActionRowBuilder<UserSelectMenuBuilder>,
    guildName: string,
  ) {
    try {
      await interaction.reply({
        embeds: [createEmbedFounded],
        components: [createSelectMemberForFounded],
        ephemeral: true,
      });

      const inter = await interaction.fetchReply();
      if (!inter) return;

      const collector = inter.createMessageComponentCollector({
        filter: (i) =>
          i.customId === `select_founded_id_${interaction.user.id}` &&
          i.user.id === interaction.user.id,
        max: 1,
      });

      collector.on('collect', async (i) => {
        if (!i.isUserSelectMenu()) return;

        const users = i.values;
        if (users.includes(interaction.user.id)) {
          await interaction.editReply({
            content: 'คุณไม่สามารถเพิ่มตัวเองเข้าใน ผู้ร่วมก่อตั้งได้',
            components: [],
            embeds: [],
          });
          return;
        }

        const userHasGuild = await this.checkUsersGuildStatus(users);

        if (userHasGuild.length > 0) {
          await this.replyWithExistingGuilds(i, userHasGuild);
          await interaction.deleteReply();
          return;
        }

        const invitedMembers = [...users, interaction.user.id]; // Include owner in invited list
        
        // Send simple confirmation to the channel
        await interaction.editReply({
          content: '✅ **คำขอสร้างกิลด์ถูกส่งแล้ว!**\n\n' +
                  `📧 ความคืบหน้าการสร้างกิลด์ **${guildName}** จะถูกส่งไปยังข้อความส่วนตัวของคุณ\n` +
                  `👥 ได้เชิญสมาชิก ${users.length} คน ให้เป็นผู้ร่วมก่อตั้ง\n` +
                  `⏰ สมาชิกมีเวลา 5 นาทีในการตอบกลับ`,
          embeds: [],
          components: [],
        });

        // Send detailed progress to DM
        const createAcceptGuildEmbeds = this.createGuildProgressEmbed(guildName, 1, invitedMembers.length);
        const dismissButton = this.createDismissButton();
        
        const progressMessage = await interaction.user.send({
          content: `🏰 **ความคืบหน้าการสร้างกิลด์ "${guildName}"**`,
          embeds: [createAcceptGuildEmbeds],
          components: [dismissButton],
        });

        const guildReport = await this.createGuildReport(interaction, progressMessage, guildName, invitedMembers);
        await this.sendGuildInvitations(
          users,
          guildReport.id,
          guildName,
          interaction.user.toString(),
        );
      });
    } catch (error) {
      await interaction.reply({
        content: 'ไม่สามารถแสดงหน้าต่างเพื่อเลือกผู้ร่วมก่อตั้งได้',
        ephemeral: true,
      });
    }
  }

  private async checkUsersGuildStatus(users: string[]): Promise<string[]> {
    const userHasGuild = [];
    for (const userId of users) {
      const user = await this.prisma.guildMembers.findFirst({
        where: { userId },
      });
      if (user) userHasGuild.push(userId);
    }
    return userHasGuild;
  }

  private async replyWithExistingGuilds(i: any, userHasGuild: string[]) {
    const embeds = new EmbedBuilder()
      .setDescription(
        `ผู้ร่วมก่อตั้งต่อไปนี้มีกิลด์อยู่แล้ว\n${userHasGuild.map((id) => `<@${id}>`).join(', ')}`,
      )
      .setColor('Red');
    await i.update({ embeds: [embeds], components: [], content: '' });
  }

  private createGuildProgressEmbed(guildName: string, confirmedCount: number, invitedCount: number): EmbedBuilder {
    return new EmbedBuilder({
      description: `# ความคืบหน้า (${confirmedCount}/${invitedCount}) ของกิลด์ ${guildName}`,
      color: 16759101,
      image: {
        url: 'https://media.discordapp.net/attachments/861491684214833182/1224411890415829102/DALLE_2024-04-02_00.35.29_-_A_digital_illustration_of_a_group_of_adventurers_gathered_around_a_map_laid_out_on_a_rustic_wooden_table_their_expressions_serious_as_they_plan_their.webp?ex=661d656f&is=660af06f&hm=e9744b69a8c206d8b8f48fd1753bc9c5f2dd06d22ef7cac9b55cb986a43d08da&=&format=webp&width=839&height=479',
      },
    });
  }

  private createDismissButton(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId('dismiss_guild_progress')
        .setLabel('ปิดการแจ้งเตือน')
        .setEmoji('✖')
        .setStyle(ButtonStyle.Secondary),
    );
  }

  private async createGuildReport(
    interaction: ChatInputCommandInteraction<CacheType>,
    msg: any,
    guildName: string,
    invitedMembers: string[],
  ) {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    return await this.prisma.guildCreateReport.create({
      data: {
        ownerId: interaction.user.id,
        serverId: interaction.guildId!, // Store the Discord server ID
        channelId: msg.channel.id, // Store DM channel ID
        messageId: msg.id,
        guildName: guildName,
        invitedMembers: { set: invitedMembers },
        confirmedMembers: { set: [interaction.user.id] }, // Owner auto-confirms
        createdAt: new Date(),
        expiresAt: expiresAt,
      },
    });
  }

  // No longer needed since we use ephemeral messages that auto-cleanup
  // private async scheduleMessageDeletion(msg: any) {
  //   return setTimeout(
  //     () => {
  //       msg?.delete().catch(() => {});
  //     },
  //     1000 * 60 * 10,
  //   );
  // }

  private async sendGuildInvitations(
    users: string[],
    guildReportId: string,
    guildName: string,
    inviter: string,
  ) {
    this.guildReportId = guildReportId;
    
    // Fetch guild creator user for better display
    const guildCreator = await this.users.fetch(users[0]).catch(() => null);
    
    for (const userId of users) {
      try {
        const user = await this.users.fetch(userId);
        
        // Create personalized invitation embed for each user
        const invitationEmbed = new EmbedBuilder({
          title: `🏰 คำเชิญเข้าร่วมก่อตั้งกิลด์ "${guildName}"`,
          description: `**${inviter}** ได้เชิญคุณให้เป็น **ผู้ร่วมก่อตั้งกิลด์**\n\n` +
                      `🎯 **บทบาทของคุณ:** ผู้ร่วมก่อตั้ง (Co-founder)\n` +
                      `💎 **สิทธิพิเศษ:** เข้าถึงห้องส่วนตัวของกิลด์, จัดการกิจกรรม, สิทธิในการตัดสินใจ`,
          color: 0x9932cc, // Purple color for invitation
          thumbnail: {
            url: 'https://media.discordapp.net/attachments/861491684214833182/1224408324922015876/DALLE_2024-04-02_00.21.20_-_A_vibrant_watercolor_of_an_elven_archer_a_human_mage_and_a_dwarf_warrior_standing_triumphantly_atop_a_hill_looking_towards_the_horizon_at_dawn._The.webp?ex=661d621d&is=660aed1d&hm=29e373d7dea2b16ceddf3e45271ca343bf01c5e5b2bbfc1ee263503f04900ca7&=&format=webp&width=839&height=479'
          },
          fields: [
            {
              name: '👑 ผู้สร้างกิลด์',
              value: `${inviter}\n*หัวหน้ากิลด์ (Guild Leader)*`,
              inline: true
            },
            {
              name: '🏷️ ชื่อกิลด์',
              value: `**${guildName}**`,
              inline: true
            },
            {
              name: '👥 ผู้ถูกเชิญร่วมก่อตั้ง',
              value: users.map((id, index) => {
                const emoji = id === userId ? '🔸' : '▫️';
                return `${emoji} <@${id}> ${id === userId ? '(คุณ)' : ''}`;
              }).join('\n'),
              inline: false
            },
            {
              name: '📋 รายละเอียดการก่อตั้ง',
              value: `• จำนวนผู้ก่อตั้งทั้งหมด: **${users.length + 1} คน** (รวมหัวหน้า)\n` +
                    `• ต้องการการยืนยันจาก: **${users.length} คน**\n` +
                    `• เมื่อครบจำนวนจะสร้างห้องพูดคุยและกิจกรรมของกิลด์ทันที`,
              inline: false
            },
            {
              name: '⏰ เวลาที่เหลือในการตอบกลับ',
              value: `<t:${Math.floor((Date.now() + 5 * 60 * 1000) / 1000)}:R>\n` +
                    `*หากไม่ตอบกลับภายในเวลาที่กำหนด การเชิญจะถูกยกเลิกอัตโนมัติ*`,
              inline: false
            }
          ],
          footer: {
            text: `กิลด์ ${guildName} • การตัดสินใจของคุณมีความสำคัญต่อการก่อตั้งกิลด์`,
            iconURL: 'https://cdn.discordapp.com/emojis/1234567890123456789.webp' // Optional guild icon
          },
          timestamp: new Date()
        });

        const createActionAccept = new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId(`cancel_guild_invite_`)
            .setLabel('ปฏิเสธการเชิญ')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`accept_guild_invite_`)
            .setLabel('ยอมรับและเข้าร่วม')
            .setEmoji('⚔️')
            .setStyle(ButtonStyle.Success),
        );

        await user.send({
          content: `🌟 **คุณได้รับคำเชิญพิเศษ!** 🌟`,
          embeds: [invitationEmbed],
          components: [createActionAccept],
        });
        
        this.logger.log(`Guild invitation sent to user ${userId} for guild "${guildName}"`);
      } catch (error) {
        this.logger.error(`Error sending DM to user ${userId}:`, error);
      }
    }

    // Schedule automatic cancellation after 5 minutes
    this.scheduleGuildCancellation(guildReportId);
  }

  private async scheduleGuildCancellation(guildReportId: string) {
    setTimeout(async () => {
      try {
        const report = await this.prisma.guildCreateReport.findFirst({
          where: { id: guildReportId }
        });

        if (!report) return; // Already processed or deleted

        // Check if guild was completed (4 members confirmed)
        if (report.confirmedMembers.length >= 4) return;

        // Cancel the guild creation
        await this.cancelExpiredGuild(report);
      } catch (error) {
        this.logger.error('Error in scheduled guild cancellation', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  private async cancelExpiredGuild(report: any) {
    try {
      // Try to edit the original DM message first
      try {
        const channel = await this.client.channels.fetch(report.channelId);
        if (channel && channel.isDMBased()) {
          const message = await channel.messages.fetch(report.messageId);
          if (message) {
            await message.edit({
              content: `⏰ **การสร้างกิลด์ "${report.guildName}" หมดเวลา**`,
              embeds: [new EmbedBuilder({
                title: '⏰ การสร้างกิลด์ถูกยกเลิก',
                description: `การสร้างกิลด์ "${report.guildName}" ถูกยกเลิกเนื่องจากไม่มีสมาชิกยืนยันครบภายในเวลาที่กำหนด (5 นาที)`,
                color: 0xff0000,
                timestamp: new Date()
              })],
              components: [] // Remove dismiss button
            });
          }
        }
      } catch (editError) {
        this.logger.warn('Could not edit original DM for cancellation, sending new message');
        
        // Fallback: Send new DM if editing failed
        const creator = await this.users.fetch(report.ownerId);
        await creator.send({
          embeds: [new EmbedBuilder({
            title: '⏰ การสร้างกิลด์ถูกยกเลิก',
            description: `การสร้างกิลด์ "${report.guildName}" ถูกยกเลิกเนื่องจากไม่มีสมาชิกยืนยันครบภายในเวลาที่กำหนด (5 นาที)`,
            color: 0xff0000
          })]
        }).catch(() => {
          this.logger.error('Failed to notify creator about cancellation');
        });
      }

      // Notify all invited members about cancellation
      const unconfirmedMembers = report.invitedMembers.filter(
        (id: string) => !report.confirmedMembers.includes(id)
      );

      for (const memberId of unconfirmedMembers) {
        try {
          const member = await this.users.fetch(memberId);
          await member.send({
            embeds: [new EmbedBuilder({
              title: '⏰ คำเชิญหมดอายุ',
              description: `การเชิญเข้าร่วมก่อตั้งกิลด์ "${report.guildName}" หมดอายุแล้ว`,
              color: 0xff9900
            })]
          }).catch(() => {
            this.logger.error(`Failed to notify member ${memberId} about cancellation`);
          });
        } catch (error) {
          this.logger.error(`Error fetching member ${memberId}`, error);
        }
      }

      // Delete the report
      await this.prisma.guildCreateReport.delete({
        where: { id: report.id }
      });

    } catch (error) {
      this.logger.error('Error cancelling expired guild', error);
    }
  }

  @Button('accept_guild_invite_')
  async acceptGuildInvite(@Context() [interaction]: ButtonContext): Promise<void> {
    this.logger.debug('Processing accept guild invite request');

    await this.guildManage.acceptInviteCreate(interaction, this.guildReportId);
  }

  @Button('cancel_guild_invite_')
  async cancelGuildInvite(@Context() [interaction]: ButtonContext): Promise<void> {
    await this.guildManage.cancelInviteCreate(interaction, this.guildReportId);
  }

  @Button('dismiss_guild_progress')
  async dismissGuildProgress(@Context() [interaction]: ButtonContext): Promise<void> {
    await interaction.update({
      content: '✅ **การแจ้งเตือนความคืบหน้าถูกปิดแล้ว**\n\n' +
              '💡 หากต้องการดูความคืบหน้า สามารถใช้คำสั่ง `/guild status` ได้\n' +
              '📱 การแจ้งเตือนจะหายไปอัตโนมัติใน 30 วินาที',
      embeds: [],
      components: [],
    });

    // Auto delete after 30 seconds
    setTimeout(async () => {
      try {
        await interaction.deleteReply();
      } catch (error) {
        // Message might already be deleted
      }
    }, 30000);
  }
}
